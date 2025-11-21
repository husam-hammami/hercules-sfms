import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import archiver from 'archiver';

export interface GatewayInstallerOptions {
  platform: 'windows' | 'linux' | 'docker';
  activationCode: string;
  userId: string;
  tenantId: string;
  apiUrl: string;
}

export class GatewayInstallerGenerator {
  private static readonly INSTALLER_TEMPLATE_DIR = path.join(process.cwd(), 'gateway-templates');
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp-installers');

  static async generateInstaller(options: GatewayInstallerOptions): Promise<Buffer> {
    // For now, only support Windows
    if (options.platform !== 'windows') {
      options.platform = 'windows';
    }
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    }

    const installerId = crypto.randomBytes(16).toString('hex');
    const tempPath = path.join(this.TEMP_DIR, installerId);
    fs.mkdirSync(tempPath, { recursive: true });

    try {
      // Create installer structure based on platform
      await this.createInstallerFiles(tempPath, options);
      
      // Create zip archive
      const zipBuffer = await this.createZipArchive(tempPath);
      
      // Cleanup temp files
      fs.rmSync(tempPath, { recursive: true, force: true });
      
      return zipBuffer;
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
      throw error;
    }
  }

  private static async createInstallerFiles(basePath: string, options: GatewayInstallerOptions) {
    // Create directory structure
    const dirs = ['config', 'scripts', 'bin', 'data', 'logs'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(basePath, dir), { recursive: true });
    });

    // Create activation config
    const activationConfig = {
      activationCode: options.activationCode,
      userId: options.userId,
      tenantId: options.tenantId,
      apiUrl: options.apiUrl || 'https://hercules-sfms.replit.app',
      createdAt: new Date().toISOString(),
      platform: options.platform
    };

    fs.writeFileSync(
      path.join(basePath, 'config', 'activation.json'),
      JSON.stringify(activationConfig, null, 2)
    );

    // Create gateway configuration
    const gatewayConfig = {
      version: '1.0.0',
      syncInterval: 30000, // 30 seconds
      dataUploadInterval: 10000, // 10 seconds
      bufferSize: 1000000, // 1MB
      logLevel: 'info',
      database: {
        type: 'sqlite',
        path: './data/gateway.db'
      },
      protocols: {
        modbus: { enabled: true },
        s7: { enabled: true },
        opcua: { enabled: true }
      }
    };

    fs.writeFileSync(
      path.join(basePath, 'config', 'gateway.yaml'),
      JSON.stringify(gatewayConfig, null, 2)
    );

    // Create platform-specific installer script
    if (options.platform === 'windows') {
      await this.createWindowsInstaller(basePath, options);
    } else if (options.platform === 'linux') {
      await this.createLinuxInstaller(basePath, options);
    } else if (options.platform === 'docker') {
      await this.createDockerInstaller(basePath, options);
    }

    // Create README
    const readme = `# Hercules SFMS Gateway Installer

## Platform: ${options.platform.toUpperCase()}
## Activation Code: ${options.activationCode}

### Installation Instructions:

${this.getInstallInstructions(options.platform)}

### Security Notice:
This gateway will connect to your industrial PLCs and sync data to the cloud portal.
Ensure you have proper network security measures in place.

### Support:
For assistance, contact support@hercules-sfms.com
`;

    fs.writeFileSync(path.join(basePath, 'README.md'), readme);
  }

  private static async createWindowsInstaller(basePath: string, options: GatewayInstallerOptions) {
    // Copy actual Python gateway files
    const gatewayFilesPath = path.join(process.cwd(), 'server', 'gateway-files');
    
    try {
      // Copy gateway.py
      const gatewayPy = fs.readFileSync(path.join(gatewayFilesPath, 'gateway.py'), 'utf-8');
      fs.writeFileSync(path.join(basePath, 'gateway.py'), gatewayPy);
      
      // Copy protocols directory
      const protocolsDir = path.join(basePath, 'protocols');
      fs.mkdirSync(protocolsDir, { recursive: true });
      
      const protocolFiles = ['__init__.py', 'modbus.py', 's7.py', 'ethernet_ip.py', 'opcua.py'];
      for (const file of protocolFiles) {
        try {
          const content = fs.readFileSync(path.join(gatewayFilesPath, 'protocols', file), 'utf-8');
          fs.writeFileSync(path.join(protocolsDir, file), content);
        } catch (e) {
          console.log(`Protocol file ${file} not found, using stub`);
        }
      }
      
      // Copy requirements.txt
      const requirements = fs.readFileSync(path.join(gatewayFilesPath, 'requirements.txt'), 'utf-8');
      fs.writeFileSync(path.join(basePath, 'requirements.txt'), requirements);
      
    } catch (e) {
      console.error('Gateway files not found, using minimal stubs');
    }
    
    // Update config.json with activation details
    const configData = {
      activation_code: options.activationCode,
      api_base: options.apiUrl || 'https://www.herculesv2.com',
      user_id: options.userId,
      offline_buffer_days: 7,
      retry_attempts: 3,
      log_level: "INFO",
      performance: {
        max_tags_per_second: 10000,
        batch_size: 100,
        cache_ttl_ms: 100,
        connection_pool_size: 10
      }
    };
    fs.writeFileSync(path.join(basePath, 'config.json'), JSON.stringify(configData, null, 2));
    
    const installScript = `@echo off
echo ===============================================
echo Hercules SFMS Gateway Installer
echo ===============================================
echo.
echo Activation Code: ${options.activationCode}
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Python is not installed!
    echo Please install Python 3.8 or higher from python.org
    pause
    exit /b 1
)

echo Installing Python dependencies...
python -m pip install -r requirements.txt

echo.
echo Creating start script...
echo @echo off > start_gateway.bat
echo echo Starting Hercules Gateway... >> start_gateway.bat
echo python gateway.py >> start_gateway.bat

echo.
echo ===============================================
echo Installation Complete!
echo ===============================================
echo.
echo To start the gateway: Run start_gateway.bat
echo.
echo The gateway will:
echo - Connect to your PLCs using the configured protocols
echo - Sync data to your portal at ${options.apiUrl}
echo - Buffer data locally for up to 7 days if offline
echo.
echo Your activation code (${options.activationCode}) has been configured.
echo.
pause
`;

    fs.writeFileSync(path.join(basePath, 'install.bat'), installScript);

    const uninstallScript = `@echo off
echo Uninstalling Hercules Gateway...

REM Stop and delete service
sc stop "HerculesGateway"
sc delete "HerculesGateway"

REM Remove files
rmdir /S /Q "C:\\Program Files\\Hercules Gateway"

echo Uninstallation completed.
pause
`;

    fs.writeFileSync(path.join(basePath, 'uninstall.bat'), uninstallScript);
  }

  private static async createLinuxInstaller(basePath: string, options: GatewayInstallerOptions) {
    const installScript = `#!/bin/bash

echo "========================================"
echo "Hercules SFMS Gateway Installer"
echo "========================================"
echo ""
echo "Activation Code: ${options.activationCode}"
echo ""

# Check for root privileges
if [ "$EUID" -ne 0 ]; then 
  echo "ERROR: Please run as root (use sudo)"
  exit 1
fi

# Create installation directory
INSTALL_DIR="/opt/hercules-gateway"
mkdir -p $INSTALL_DIR

# Copy files
echo "Installing gateway files..."
cp -r ./* $INSTALL_DIR/

# Set permissions
chmod +x $INSTALL_DIR/bin/gateway-service
chmod 600 $INSTALL_DIR/config/activation.json

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/hercules-gateway.service << EOF
[Unit]
Description=Hercules SFMS Gateway Service
After=network.target

[Service]
Type=simple
User=hercules
Group=hercules
WorkingDirectory=/opt/hercules-gateway
ExecStart=/opt/hercules-gateway/bin/gateway-service
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create service user
useradd -r -s /bin/false hercules 2>/dev/null
chown -R hercules:hercules $INSTALL_DIR

# Enable and start service
systemctl daemon-reload
systemctl enable hercules-gateway
systemctl start hercules-gateway

echo ""
echo "========================================"
echo "Installation completed successfully!"
echo "Gateway is running as systemd service."
echo "Use 'systemctl status hercules-gateway' to check status."
echo "========================================"
`;

    fs.writeFileSync(path.join(basePath, 'install.sh'), installScript);
    fs.chmodSync(path.join(basePath, 'install.sh'), '755');

    const uninstallScript = `#!/bin/bash

echo "Uninstalling Hercules Gateway..."

# Stop and disable service
systemctl stop hercules-gateway
systemctl disable hercules-gateway
rm /etc/systemd/system/hercules-gateway.service
systemctl daemon-reload

# Remove files
rm -rf /opt/hercules-gateway

# Remove user
userdel hercules 2>/dev/null

echo "Uninstallation completed."
`;

    fs.writeFileSync(path.join(basePath, 'uninstall.sh'), uninstallScript);
    fs.chmodSync(path.join(basePath, 'uninstall.sh'), '755');
  }

  private static async createDockerInstaller(basePath: string, options: GatewayInstallerOptions) {
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Install required packages
RUN apk add --no-cache python3 make g++ sqlite

# Copy gateway files
COPY . /app/

# Set environment variables
ENV NODE_ENV=production
ENV ACTIVATION_CODE=${options.activationCode}
ENV API_URL=${options.apiUrl || 'https://hercules-sfms.replit.app'}

# Expose metrics port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node bin/health-check.js || exit 1

# Run gateway
CMD ["node", "bin/gateway-service.js"]
`;

    fs.writeFileSync(path.join(basePath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  hercules-gateway:
    build: .
    container_name: hercules-gateway
    restart: always
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config:/app/config:ro
    environment:
      - NODE_ENV=production
      - ACTIVATION_CODE=${options.activationCode}
      - API_URL=${options.apiUrl || 'https://hercules-sfms.replit.app'}
    networks:
      - plc-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  plc-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  gateway-data:
  gateway-logs:
`;

    fs.writeFileSync(path.join(basePath, 'docker-compose.yml'), dockerCompose);

    const runScript = `#!/bin/bash

echo "Starting Hercules Gateway with Docker..."
echo "Activation Code: ${options.activationCode}"

# Build and start containers
docker-compose up -d

echo "Gateway is running in Docker."
echo "Use 'docker-compose logs -f' to view logs."
echo "Use 'docker-compose down' to stop."
`;

    fs.writeFileSync(path.join(basePath, 'run.sh'), runScript);
    fs.chmodSync(path.join(basePath, 'run.sh'), '755');
  }

  private static getInstallInstructions(platform: string): string {
    switch (platform) {
      case 'windows':
        return `1. Extract all files to a temporary directory
2. Right-click on 'install.bat' and select 'Run as Administrator'
3. Follow the installation prompts
4. The gateway will be installed as a Windows service`;
      case 'linux':
        return `1. Extract all files: tar -xzvf hercules-gateway.tar.gz
2. Run installation: sudo ./install.sh
3. Check service status: systemctl status hercules-gateway
4. View logs: journalctl -u hercules-gateway -f`;
      case 'docker':
        return `1. Extract all files to a directory
2. Run: ./run.sh or docker-compose up -d
3. View logs: docker-compose logs -f
4. Stop: docker-compose down`;
      default:
        return 'Please refer to platform-specific documentation.';
    }
  }

  private static async createZipArchive(sourcePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      archive.directory(sourcePath, false);
      archive.finalize();
    });
  }
}