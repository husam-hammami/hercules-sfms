#!/usr/bin/env python3
"""
Build script to create Windows executable for Hercules Gateway
Uses PyInstaller to bundle everything into a single executable
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def build_executable():
    """Build the Windows executable using PyInstaller"""
    
    print("="*60)
    print("Hercules Gateway - Windows Executable Builder")
    print("="*60)
    
    # Get current directory
    current_dir = Path(__file__).parent
    
    # PyInstaller command
    pyinstaller_cmd = [
        "pyinstaller",
        "--onefile",  # Single executable
        "--windowed",  # No console window
        "--name", "HerculesGateway",
        "--icon", "NONE",  # Add icon path if available
        "--add-data", f"protocols;protocols",  # Include protocols folder
        "--hidden-import", "pymodbus",
        "--hidden-import", "snap7",
        "--hidden-import", "pycomm3",
        "--hidden-import", "opcua",
        "--hidden-import", "websocket",
        "--hidden-import", "keyring.backends.Windows",
        "--distpath", "dist",
        "--workpath", "build",
        "--specpath", "build",
        "gateway.py"
    ]
    
    print("Building executable...")
    print(f"Command: {' '.join(pyinstaller_cmd)}")
    
    try:
        # Run PyInstaller
        result = subprocess.run(pyinstaller_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("\n✓ Build successful!")
            print(f"Executable created at: dist/HerculesGateway.exe")
            
            # Create installer package
            create_installer_package()
            
        else:
            print("\n✗ Build failed!")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"\n✗ Build error: {e}")
        return False
    
    return True

def create_installer_package():
    """Create a complete installer package with all necessary files"""
    
    print("\nCreating installer package...")
    
    # Create package directory
    package_dir = Path("HerculesGateway_Installer")
    if package_dir.exists():
        shutil.rmtree(package_dir)
    package_dir.mkdir()
    
    # Copy executable
    shutil.copy("dist/HerculesGateway.exe", package_dir)
    
    # Create default config template
    config_content = """{
  "activation_code": "XXXX-XXXX-XXXX",
  "api_base": "https://www.herculesv2.com",
  "offline_buffer_days": 7,
  "retry_attempts": 3,
  "log_level": "INFO"
}"""
    
    config_path = package_dir / "config.json"
    with open(config_path, "w") as f:
        f.write(config_content)
    
    # Create installer batch file
    installer_content = """@echo off
echo ===============================================
echo Hercules SFMS Gateway Installer
echo ===============================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrative permissions confirmed.
) else (
    echo Please run this installer as Administrator!
    pause
    exit /b 1
)

echo Installing Hercules Gateway...
echo.

REM Create installation directory
set INSTALL_DIR="C:\\Program Files\\Hercules Gateway"
if not exist %INSTALL_DIR% mkdir %INSTALL_DIR%

REM Copy files
copy /Y HerculesGateway.exe %INSTALL_DIR%
copy /Y config.json %INSTALL_DIR%

REM Create Windows service
sc create "HerculesGateway" binPath= "%INSTALL_DIR%\\HerculesGateway.exe" DisplayName= "Hercules SFMS Gateway" start= auto
sc description "HerculesGateway" "Hercules SFMS Gateway for PLC data collection"

REM Start the service
sc start HerculesGateway

echo.
echo ===============================================
echo Installation Complete!
echo ===============================================
echo.
echo Gateway installed to: %INSTALL_DIR%
echo Service Name: HerculesGateway
echo.
echo IMPORTANT: Edit config.json with your activation code
echo Location: %INSTALL_DIR%\\config.json
echo.
echo To manage the service:
echo   - Start: sc start HerculesGateway
echo   - Stop: sc stop HerculesGateway
echo   - Status: sc query HerculesGateway
echo.
pause
"""
    
    installer_path = package_dir / "install.bat"
    with open(installer_path, "w") as f:
        f.write(installer_content)
    
    # Create uninstaller
    uninstaller_content = """@echo off
echo ===============================================
echo Hercules Gateway Uninstaller
echo ===============================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrative permissions confirmed.
) else (
    echo Please run this uninstaller as Administrator!
    pause
    exit /b 1
)

echo Uninstalling Hercules Gateway...

REM Stop and delete service
sc stop HerculesGateway
sc delete HerculesGateway

REM Remove files
rmdir /S /Q "C:\\Program Files\\Hercules Gateway"

echo.
echo Uninstallation complete!
pause
"""
    
    uninstaller_path = package_dir / "uninstall.bat"
    with open(uninstaller_path, "w") as f:
        f.write(uninstaller_content)
    
    # Create README
    readme_content = """Hercules SFMS Gateway - Installation Instructions
================================================

1. BEFORE INSTALLATION:
   - Ensure you have your activation code from the portal
   - Close any antivirus software temporarily (may flag as false positive)

2. INSTALLATION:
   - Right-click "install.bat" and select "Run as Administrator"
   - The gateway will be installed as a Windows service

3. CONFIGURATION:
   - Edit config.json in C:\\Program Files\\Hercules Gateway\\
   - Replace XXXX-XXXX-XXXX with your activation code
   - Restart the service: sc restart HerculesGateway

4. VERIFY INSTALLATION:
   - Check service status: sc query HerculesGateway
   - Check logs: C:\\Program Files\\Hercules Gateway\\gateway.log

5. TROUBLESHOOTING:
   - If service won't start, check config.json
   - Ensure firewall allows outbound HTTPS connections
   - Contact support with gateway.log if issues persist

6. UNINSTALLATION:
   - Run "uninstall.bat" as Administrator

Support: support@herculesv2.com
"""
    
    readme_path = package_dir / "README.txt"
    with open(readme_path, "w") as f:
        f.write(readme_content)
    
    print(f"✓ Installer package created at: {package_dir}")
    
    # Create ZIP file
    try:
        shutil.make_archive("HerculesGateway_v1.0.0_Windows", "zip", package_dir)
        print(f"✓ ZIP package created: HerculesGateway_v1.0.0_Windows.zip")
    except Exception as e:
        print(f"Warning: Could not create ZIP file: {e}")

if __name__ == "__main__":
    if build_executable():
        print("\n" + "="*60)
        print("BUILD SUCCESSFUL!")
        print("Package ready for distribution")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("BUILD FAILED!")
        print("Check errors above")
        print("="*60)
        sys.exit(1)