#!/usr/bin/env python3
"""
Production Build Script for Hercules Gateway
Creates a signed, optimized Windows executable with all industrial features
"""

import os
import sys
import shutil
import subprocess
import hashlib
import json
import zipfile
from pathlib import Path
from datetime import datetime

# Build configuration
BUILD_CONFIG = {
    'name': 'HerculesGateway',
    'version': '2.0.0',
    'company': 'Hercules SFMS',
    'product': 'Industrial IoT Gateway',
    'copyright': f'Copyright © {datetime.now().year} Hercules SFMS',
    'description': 'Enterprise-grade gateway for industrial PLC data collection',
    'icon': 'hercules.ico',
    'optimization': 'production'
}

def create_version_file():
    """Create version information file for Windows executable"""
    version_content = f"""# UTF-8
VSVersionInfo(
  ffi=FixedFileInfo(
    filevers=({2}, {0}, {0}, {0}),
    prodvers=({2}, {0}, {0}, {0}),
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
    ),
  kids=[
    StringFileInfo(
      [
      StringTable(
        u'040904B0',
        [StringStruct(u'CompanyName', u'{BUILD_CONFIG["company"]}'),
        StringStruct(u'FileDescription', u'{BUILD_CONFIG["description"]}'),
        StringStruct(u'FileVersion', u'{BUILD_CONFIG["version"]}'),
        StringStruct(u'InternalName', u'{BUILD_CONFIG["name"]}'),
        StringStruct(u'LegalCopyright', u'{BUILD_CONFIG["copyright"]}'),
        StringStruct(u'OriginalFilename', u'{BUILD_CONFIG["name"]}.exe'),
        StringStruct(u'ProductName', u'{BUILD_CONFIG["product"]}'),
        StringStruct(u'ProductVersion', u'{BUILD_CONFIG["version"]}')])
      ]), 
    VarFileInfo([VarStruct(u'Translation', [1033, 1200])])
  ]
)"""
    
    with open('version.txt', 'w', encoding='utf-8') as f:
        f.write(version_content)
    
    print("✓ Version file created")

def optimize_python_code():
    """Optimize Python code for production"""
    print("Optimizing Python code...")
    
    # Compile all Python files to bytecode
    import py_compile
    import compileall
    
    # Compile with optimization level 2 (remove docstrings and asserts)
    compileall.compile_dir(
        '.', 
        force=True, 
        optimize=2,
        quiet=1
    )
    
    print("✓ Python code optimized")

def create_spec_file():
    """Create optimized PyInstaller spec file"""
    spec_content = f"""# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

# Collect all protocol modules
hiddenimports = []
hiddenimports += collect_submodules('protocols')
hiddenimports += ['websocket', 'psutil', 'keyring', 'getmac']
hiddenimports += ['pymodbus', 'snap7', 'pycomm3', 'asyncua']
hiddenimports += ['sqlite3', 'gzip', 'uuid', 'threading']

# Collect data files
datas = []
datas += collect_data_files('protocols')

# Binary dependencies
binaries = []
if sys.platform == 'win32':
    # Include Windows service dependencies
    binaries += [
        ('C:/Windows/System32/api-ms-win-*.dll', '.'),
        ('C:/Windows/System32/ucrtbase.dll', '.'),
    ]

a = Analysis(
    ['gateway.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# Remove unnecessary modules to reduce size
a.binaries = [x for x in a.binaries if not x[0].startswith('tk')]
a.binaries = [x for x in a.binaries if not x[0].startswith('tcl')]

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=None,
    optimize=2  # Maximum optimization
)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='{BUILD_CONFIG["name"]}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,  # Strip symbols for smaller size
    upx=True,    # Compress with UPX
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window for service
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version='version.txt',
    icon='{BUILD_CONFIG["icon"]}' if os.path.exists('{BUILD_CONFIG["icon"]}') else None,
    uac_admin=True,  # Request admin privileges
)

# Create installer package
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=True,
    upx=True,
    upx_exclude=[],
    name='{BUILD_CONFIG["name"]}_Package',
)
"""
    
    with open('gateway.spec', 'w') as f:
        f.write(spec_content)
    
    print("✓ Spec file created")

def build_executable():
    """Build the executable using PyInstaller"""
    print("\nBuilding executable...")
    
    # Clean previous builds
    for path in ['build', 'dist', '__pycache__']:
        if Path(path).exists():
            shutil.rmtree(path)
    
    # Run PyInstaller with production settings
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        '--log-level=WARN',
        'gateway.spec'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✓ Executable built successfully")
        return True
    else:
        print(f"✗ Build failed: {result.stderr}")
        return False

def sign_executable():
    """Sign the executable with code signing certificate"""
    print("\nSigning executable...")
    
    exe_path = Path(f'dist/{BUILD_CONFIG["name"]}.exe')
    
    if not exe_path.exists():
        print("✗ Executable not found")
        return False
    
    # Check for signtool
    signtool_paths = [
        r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
        r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe",
        r"C:\Program Files (x86)\Windows Kits\10\bin\x64\signtool.exe"
    ]
    
    signtool = None
    for path in signtool_paths:
        if Path(path).exists():
            signtool = path
            break
    
    if not signtool:
        print("⚠ Signtool not found - executable will not be signed")
        print("  Install Windows SDK for code signing capability")
        return False
    
    # Self-signed certificate for development
    # In production, use a proper code signing certificate
    cmd = [
        signtool, 'sign',
        '/n', BUILD_CONFIG["company"],
        '/t', 'http://timestamp.digicert.com',
        '/fd', 'SHA256',
        '/v',
        str(exe_path)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print("✓ Executable signed successfully")
            return True
        else:
            print(f"⚠ Signing failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"⚠ Signing error: {e}")
        return False

def create_installer():
    """Create installation package"""
    print("\nCreating installer package...")
    
    dist_dir = Path('dist')
    package_dir = dist_dir / 'HerculesGateway_Installer'
    
    # Create package directory structure
    package_dir.mkdir(parents=True, exist_ok=True)
    (package_dir / 'bin').mkdir(exist_ok=True)
    (package_dir / 'config').mkdir(exist_ok=True)
    (package_dir / 'logs').mkdir(exist_ok=True)
    (package_dir / 'data').mkdir(exist_ok=True)
    
    # Copy executable and dependencies
    exe_path = dist_dir / f'{BUILD_CONFIG["name"]}.exe'
    if exe_path.exists():
        shutil.copy2(exe_path, package_dir / 'bin')
    
    # Copy database files
    for db_file in ['gateway_config.db', 'buffer.db']:
        db_path = Path(db_file)
        if db_path.exists():
            shutil.copy2(db_path, package_dir / 'data')
    
    # Create default configuration
    default_config = {
        'activation_code': '',
        'api_base': 'https://www.herculesv2.com',
        'log_level': 'INFO',
        'scan_interval': 1000,
        'buffer_size': 10000,
        'offline_mode': False
    }
    
    with open(package_dir / 'config' / 'default.json', 'w') as f:
        json.dump(default_config, f, indent=2)
    
    # Create installation script
    install_script = f"""@echo off
echo ===============================================
echo  Hercules Gateway Installation
echo  Version: {BUILD_CONFIG["version"]}
echo ===============================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This installer requires administrator privileges.
    echo Please run as administrator.
    pause
    exit /b 1
)

echo Installing Hercules Gateway...
echo.

:: Create installation directory
set INSTALL_DIR=C:\\Program Files\\HerculesGateway
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copy files
xcopy /E /I /Y bin "%INSTALL_DIR%\\bin"
xcopy /E /I /Y config "%INSTALL_DIR%\\config"
xcopy /E /I /Y data "%INSTALL_DIR%\\data"
if not exist "%INSTALL_DIR%\\logs" mkdir "%INSTALL_DIR%\\logs"

:: Install as Windows service
echo.
echo Installing Windows service...
"%INSTALL_DIR%\\bin\\{BUILD_CONFIG["name"]}.exe" install

:: Configure service for automatic start
sc config HerculesGateway start=auto
sc failure HerculesGateway reset=3600 actions=restart/5000/restart/10000/restart/30000

:: Create desktop shortcut
powershell -Command "$WS = New-Object -ComObject WScript.Shell; $SC = $WS.CreateShortcut('$env:USERPROFILE\\Desktop\\Hercules Gateway.lnk'); $SC.TargetPath = '%INSTALL_DIR%\\bin\\{BUILD_CONFIG["name"]}.exe'; $SC.Arguments = 'debug'; $SC.IconLocation = '%INSTALL_DIR%\\bin\\{BUILD_CONFIG["name"]}.exe'; $SC.Save()"

echo.
echo ===============================================
echo  Installation Complete!
echo ===============================================
echo.
echo The gateway has been installed as a Windows service.
echo It will start automatically on system boot.
echo.
echo To configure the gateway:
echo   1. Edit %INSTALL_DIR%\\config\\config.json
echo   2. Add your activation code
echo   3. Restart the service
echo.
echo Service commands:
echo   net start HerculesGateway    - Start service
echo   net stop HerculesGateway     - Stop service
echo.
pause
"""
    
    with open(package_dir / 'install.bat', 'w') as f:
        f.write(install_script)
    
    # Create uninstall script
    uninstall_script = f"""@echo off
echo Uninstalling Hercules Gateway...

:: Stop and remove service
net stop HerculesGateway 2>nul
"%INSTALL_DIR%\\bin\\{BUILD_CONFIG["name"]}.exe" uninstall

:: Remove files
rmdir /S /Q "C:\\Program Files\\HerculesGateway"

:: Remove desktop shortcut
del "%USERPROFILE%\\Desktop\\Hercules Gateway.lnk" 2>nul

echo Uninstallation complete.
pause
"""
    
    with open(package_dir / 'uninstall.bat', 'w') as f:
        f.write(uninstall_script)
    
    # Create README
    readme = f"""
# Hercules Gateway v{BUILD_CONFIG["version"]}

## Industrial IoT Gateway for PLC Data Collection

### Installation
1. Run install.bat as Administrator
2. Configure your activation code in config/config.json
3. The service will start automatically

### Features
- Universal PLC protocol support (Modbus, S7, EtherNet/IP, OPC UA)
- Local SQLite database for offline operation
- Automatic configuration synchronization
- Windows service with auto-recovery
- Industrial-grade reliability

### System Requirements
- Windows 10/11 or Windows Server 2016+
- 4 GB RAM minimum
- 100 MB disk space
- Network access to PLCs
- Internet connection for portal sync (optional)

### Support
Visit: https://www.herculesv2.com
Email: support@herculesv2.com
"""
    
    with open(package_dir / 'README.txt', 'w') as f:
        f.write(readme)
    
    # Create ZIP package
    zip_path = dist_dir / f'HerculesGateway_v{BUILD_CONFIG["version"]}_Setup.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(package_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(package_dir)
                zipf.write(file_path, arcname)
    
    # Calculate checksums
    with open(zip_path, 'rb') as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    
    # Create checksum file
    with open(dist_dir / 'checksums.txt', 'w') as f:
        f.write(f"SHA256: {sha256}\n")
        f.write(f"File: {zip_path.name}\n")
        f.write(f"Size: {zip_path.stat().st_size:,} bytes\n")
        f.write(f"Built: {datetime.now().isoformat()}\n")
    
    print(f"✓ Installer package created: {zip_path}")
    print(f"  SHA256: {sha256}")
    print(f"  Size: {zip_path.stat().st_size:,} bytes")
    
    return True

def main():
    """Main build process"""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           Hercules Gateway Production Build                  ║
║                    Version {BUILD_CONFIG["version"]}                             ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    os.chdir(Path(__file__).parent)
    
    # Build steps
    steps = [
        ("Creating version file", create_version_file),
        ("Optimizing code", optimize_python_code),
        ("Creating spec file", create_spec_file),
        ("Building executable", build_executable),
        ("Signing executable", sign_executable),
        ("Creating installer", create_installer)
    ]
    
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        try:
            if not step_func():
                if step_name == "Signing executable":
                    print("⚠ Continuing without signature...")
                else:
                    print(f"✗ Build failed at: {step_name}")
                    return 1
        except Exception as e:
            print(f"✗ Error in {step_name}: {e}")
            return 1
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                  BUILD SUCCESSFUL!                           ║
╠══════════════════════════════════════════════════════════════╣
║  Package: dist/HerculesGateway_v{BUILD_CONFIG["version"]}_Setup.zip       ║
║  Ready for deployment to industrial environments             ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())