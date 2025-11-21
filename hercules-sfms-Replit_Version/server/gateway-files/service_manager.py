#!/usr/bin/env python3
"""
Windows Service Manager for Hercules Gateway
Provides industrial-grade service management with automatic recovery
"""

import sys
import os
import time
import logging
import threading
import signal
from pathlib import Path

# Windows-specific imports
if sys.platform == 'win32':
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
    import win32api
    import win32con

logger = logging.getLogger(__name__)

class HerculesGatewayService:
    """Windows Service wrapper for Hercules Gateway"""
    
    def __init__(self):
        self.gateway = None
        self.running = False
        self.restart_count = 0
        self.max_restarts = 5
        self.restart_window = 3600  # 1 hour
        self.last_restart_time = 0
        
    def start_gateway(self):
        """Start the gateway application"""
        try:
            from gateway import HerculesGateway
            
            self.gateway = HerculesGateway()
            self.gateway.run()
        except Exception as e:
            logger.error(f"Gateway startup failed: {e}")
            self.handle_failure()
    
    def handle_failure(self):
        """Handle gateway failure with automatic recovery"""
        current_time = time.time()
        
        # Reset restart count if outside window
        if current_time - self.last_restart_time > self.restart_window:
            self.restart_count = 0
        
        self.restart_count += 1
        self.last_restart_time = current_time
        
        if self.restart_count <= self.max_restarts:
            logger.warning(f"Restarting gateway (attempt {self.restart_count}/{self.max_restarts})")
            time.sleep(min(self.restart_count * 5, 30))  # Exponential backoff
            self.start_gateway()
        else:
            logger.error("Max restart attempts reached. Service stopping.")
            self.stop()
    
    def stop(self):
        """Stop the gateway"""
        self.running = False
        if self.gateway:
            self.gateway.running = False

if sys.platform == 'win32':
    class HerculesWindowsService(win32serviceutil.ServiceFramework):
        """Windows Service implementation"""
        
        _svc_name_ = "HerculesGateway"
        _svc_display_name_ = "Hercules SFMS Gateway"
        _svc_description_ = "Industrial IoT Gateway for PLC data collection and portal synchronization"
        
        def __init__(self, args):
            win32serviceutil.ServiceFramework.__init__(self, args)
            self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
            self.gateway_service = HerculesGatewayService()
            
        def SvcStop(self):
            """Stop the Windows service"""
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            win32event.SetEvent(self.hWaitStop)
            self.gateway_service.stop()
            
        def SvcDoRun(self):
            """Run the Windows service"""
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, '')
            )
            
            # Start gateway in separate thread
            gateway_thread = threading.Thread(target=self.gateway_service.start_gateway)
            gateway_thread.daemon = True
            gateway_thread.start()
            
            # Wait for stop signal
            win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
            
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STOPPED,
                (self._svc_name_, '')
            )

class UnixDaemon:
    """Unix/Linux daemon implementation"""
    
    def __init__(self):
        self.gateway_service = HerculesGatewayService()
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        signal.signal(signal.SIGTERM, self.handle_signal)
        signal.signal(signal.SIGINT, self.handle_signal)
        signal.signal(signal.SIGHUP, self.handle_reload)
    
    def handle_signal(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.gateway_service.stop()
        sys.exit(0)
    
    def handle_reload(self, signum, frame):
        """Handle configuration reload signal"""
        logger.info("Received SIGHUP, reloading configuration...")
        if self.gateway_service.gateway:
            self.gateway_service.gateway.sync_configuration()
    
    def daemonize(self):
        """Daemonize the process"""
        try:
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError as e:
            logger.error(f"Fork #1 failed: {e}")
            sys.exit(1)
        
        os.chdir("/")
        os.setsid()
        os.umask(0)
        
        try:
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError as e:
            logger.error(f"Fork #2 failed: {e}")
            sys.exit(1)
        
        # Redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()
        
        with open('/dev/null', 'r') as dev_null:
            os.dup2(dev_null.fileno(), sys.stdin.fileno())
        
        # Write PID file
        pid_file = Path('/var/run/hercules-gateway.pid')
        with open(pid_file, 'w') as f:
            f.write(str(os.getpid()))
    
    def run(self):
        """Run as daemon"""
        self.daemonize()
        self.gateway_service.start_gateway()

def install_service():
    """Install Windows service"""
    if sys.platform == 'win32':
        win32serviceutil.InstallService(
            HerculesWindowsService,
            HerculesWindowsService._svc_name_,
            HerculesWindowsService._svc_display_name_,
            startType=win32service.SERVICE_AUTO_START,
            description=HerculesWindowsService._svc_description_
        )
        print(f"Service {HerculesWindowsService._svc_name_} installed successfully")
        
        # Set recovery options
        try:
            import subprocess
            cmd = f'sc failure {HerculesWindowsService._svc_name_} reset=3600 actions=restart/5000/restart/10000/restart/30000'
            subprocess.run(cmd, shell=True, check=True)
            print("Service recovery options configured")
        except:
            pass
    else:
        print("Service installation is only supported on Windows")
        print("For Linux, use systemd or init.d scripts")

def uninstall_service():
    """Uninstall Windows service"""
    if sys.platform == 'win32':
        win32serviceutil.RemoveService(HerculesWindowsService._svc_name_)
        print(f"Service {HerculesWindowsService._svc_name_} uninstalled")
    else:
        print("Service uninstallation is only supported on Windows")

def main():
    """Main entry point for service management"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'install':
            install_service()
        elif command == 'uninstall':
            uninstall_service()
        elif command == 'start':
            if sys.platform == 'win32':
                win32serviceutil.StartService(HerculesWindowsService._svc_name_)
                print("Service started")
            else:
                daemon = UnixDaemon()
                daemon.run()
        elif command == 'stop':
            if sys.platform == 'win32':
                win32serviceutil.StopService(HerculesWindowsService._svc_name_)
                print("Service stopped")
        elif command == 'restart':
            if sys.platform == 'win32':
                win32serviceutil.RestartService(HerculesWindowsService._svc_name_)
                print("Service restarted")
        elif command == 'debug':
            # Run in console mode for debugging
            service = HerculesGatewayService()
            try:
                service.start_gateway()
            except KeyboardInterrupt:
                service.stop()
        else:
            print(f"Unknown command: {command}")
            print("Usage: service_manager.py [install|uninstall|start|stop|restart|debug]")
    else:
        if sys.platform == 'win32':
            # Run as Windows service
            win32serviceutil.HandleCommandLine(HerculesWindowsService)
        else:
            # Run as Unix daemon
            daemon = UnixDaemon()
            daemon.gateway_service.start_gateway()

if __name__ == '__main__':
    main()