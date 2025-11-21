#!/usr/bin/env python3
"""
Local Configuration Database for Hercules Gateway
Manages PLCs, tags, and configurations locally with portal synchronization
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
import threading

logger = logging.getLogger(__name__)

class GatewayDatabase:
    """Industrial-grade local database for gateway configuration"""
    
    def __init__(self, db_path: Path = None):
        self.db_path = db_path or Path(__file__).parent / 'gateway_config.db'
        self.lock = threading.Lock()
        self.init_database()
        
    def init_database(self):
        """Initialize database with all required tables"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Gateway configuration table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS gateway_config (
                    id INTEGER PRIMARY KEY,
                    gateway_id TEXT UNIQUE,
                    api_key TEXT,
                    portal_url TEXT,
                    activation_date DATETIME,
                    last_sync DATETIME,
                    sync_enabled BOOLEAN DEFAULT 1,
                    offline_mode BOOLEAN DEFAULT 0,
                    config_version INTEGER DEFAULT 0,
                    settings TEXT DEFAULT '{}'
                )
            ''')
            
            # PLC devices table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS plc_devices (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    protocol TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT 1,
                    connection_config TEXT NOT NULL,
                    scan_rate INTEGER DEFAULT 1000,
                    timeout INTEGER DEFAULT 3000,
                    retry_count INTEGER DEFAULT 3,
                    status TEXT DEFAULT 'disconnected',
                    last_connect DATETIME,
                    last_error TEXT,
                    statistics TEXT DEFAULT '{}',
                    portal_sync BOOLEAN DEFAULT 1,
                    local_only BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tag definitions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tag_definitions (
                    id TEXT PRIMARY KEY,
                    plc_id TEXT NOT NULL,
                    tag_name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    data_type TEXT DEFAULT 'REAL',
                    scan_class TEXT DEFAULT 'default',
                    active BOOLEAN DEFAULT 1,
                    description TEXT,
                    unit TEXT,
                    scaling_enabled BOOLEAN DEFAULT 0,
                    scale_factor REAL DEFAULT 1.0,
                    offset REAL DEFAULT 0.0,
                    min_value REAL,
                    max_value REAL,
                    deadband REAL DEFAULT 0.0,
                    log_enabled BOOLEAN DEFAULT 1,
                    alarm_enabled BOOLEAN DEFAULT 0,
                    alarm_config TEXT,
                    last_value REAL,
                    last_quality INTEGER DEFAULT 0,
                    last_timestamp DATETIME,
                    portal_sync BOOLEAN DEFAULT 1,
                    local_only BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plc_id) REFERENCES plc_devices(id) ON DELETE CASCADE
                )
            ''')
            
            # Create indexes for performance
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_tags_plc 
                ON tag_definitions(plc_id, active)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_tags_scan 
                ON tag_definitions(scan_class, active)
            ''')
            
            # Historical data table (ring buffer)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tag_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tag_id TEXT NOT NULL,
                    value REAL,
                    quality INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    uploaded BOOLEAN DEFAULT 0,
                    FOREIGN KEY (tag_id) REFERENCES tag_definitions(id) ON DELETE CASCADE
                )
            ''')
            
            # Create trigger to maintain ring buffer (keep last 100k records)
            cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS limit_history_size
                AFTER INSERT ON tag_history
                BEGIN
                    DELETE FROM tag_history
                    WHERE id IN (
                        SELECT id FROM tag_history
                        ORDER BY timestamp DESC
                        LIMIT -1 OFFSET 100000
                    );
                END
            ''')
            
            # Alarm events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alarm_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tag_id TEXT NOT NULL,
                    alarm_type TEXT,
                    alarm_value REAL,
                    setpoint REAL,
                    active BOOLEAN DEFAULT 1,
                    acknowledged BOOLEAN DEFAULT 0,
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME,
                    ack_time DATETIME,
                    ack_user TEXT,
                    FOREIGN KEY (tag_id) REFERENCES tag_definitions(id)
                )
            ''')
            
            # Configuration changes audit log
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS config_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT,
                    action TEXT NOT NULL,
                    old_value TEXT,
                    new_value TEXT,
                    source TEXT DEFAULT 'local',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info(f"Database initialized at {self.db_path}")
    
    def save_gateway_config(self, config: Dict[str, Any]) -> bool:
        """Save or update gateway configuration"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO gateway_config 
                    (id, gateway_id, api_key, portal_url, activation_date, settings)
                    VALUES (1, ?, ?, ?, ?, ?)
                ''', (
                    config.get('gateway_id'),
                    config.get('api_key'),
                    config.get('portal_url'),
                    config.get('activation_date', datetime.now()),
                    json.dumps(config.get('settings', {}))
                ))
                
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Failed to save gateway config: {e}")
                return False
    
    def get_gateway_config(self) -> Optional[Dict[str, Any]]:
        """Get gateway configuration"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM gateway_config WHERE id = 1')
                row = cursor.fetchone()
                conn.close()
                
                if row:
                    return {
                        'gateway_id': row['gateway_id'],
                        'api_key': row['api_key'],
                        'portal_url': row['portal_url'],
                        'activation_date': row['activation_date'],
                        'last_sync': row['last_sync'],
                        'sync_enabled': bool(row['sync_enabled']),
                        'offline_mode': bool(row['offline_mode']),
                        'config_version': row['config_version'],
                        'settings': json.loads(row['settings'] or '{}')
                    }
                return None
            except Exception as e:
                logger.error(f"Failed to get gateway config: {e}")
                return None
    
    def upsert_plc(self, plc: Dict[str, Any]) -> bool:
        """Insert or update PLC configuration"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Log the change
                cursor.execute('SELECT connection_config FROM plc_devices WHERE id = ?', (plc['id'],))
                old = cursor.fetchone()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO plc_devices 
                    (id, name, protocol, enabled, connection_config, 
                     scan_rate, timeout, retry_count, portal_sync, local_only, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    plc['id'],
                    plc['name'],
                    plc['protocol'],
                    plc.get('enabled', True),
                    json.dumps(plc.get('connection_config', {})),
                    plc.get('scan_rate', 1000),
                    plc.get('timeout', 3000),
                    plc.get('retry_count', 3),
                    plc.get('portal_sync', True),
                    plc.get('local_only', False)
                ))
                
                # Audit log
                cursor.execute('''
                    INSERT INTO config_audit (entity_type, entity_id, action, old_value, new_value, source)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    'plc',
                    plc['id'],
                    'update' if old else 'create',
                    old[0] if old else None,
                    json.dumps(plc.get('connection_config', {})),
                    'portal' if plc.get('portal_sync') else 'local'
                ))
                
                conn.commit()
                conn.close()
                logger.info(f"PLC {plc['id']} configuration saved")
                return True
            except Exception as e:
                logger.error(f"Failed to save PLC {plc.get('id')}: {e}")
                return False
    
    def get_plcs(self, enabled_only: bool = True) -> List[Dict[str, Any]]:
        """Get all PLC configurations"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                query = 'SELECT * FROM plc_devices'
                if enabled_only:
                    query += ' WHERE enabled = 1'
                query += ' ORDER BY name'
                
                cursor.execute(query)
                rows = cursor.fetchall()
                conn.close()
                
                plcs = []
                for row in rows:
                    plcs.append({
                        'id': row['id'],
                        'name': row['name'],
                        'protocol': row['protocol'],
                        'enabled': bool(row['enabled']),
                        'connection_config': json.loads(row['connection_config'] or '{}'),
                        'scan_rate': row['scan_rate'],
                        'timeout': row['timeout'],
                        'retry_count': row['retry_count'],
                        'status': row['status'],
                        'last_connect': row['last_connect'],
                        'last_error': row['last_error'],
                        'statistics': json.loads(row['statistics'] or '{}'),
                        'portal_sync': bool(row['portal_sync']),
                        'local_only': bool(row['local_only'])
                    })
                
                return plcs
            except Exception as e:
                logger.error(f"Failed to get PLCs: {e}")
                return []
    
    def update_plc_status(self, plc_id: str, status: str, error: str = None) -> bool:
        """Update PLC connection status"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE plc_devices 
                    SET status = ?, last_connect = ?, last_error = ?
                    WHERE id = ?
                ''', (status, datetime.now() if status == 'connected' else None, error, plc_id))
                
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Failed to update PLC status: {e}")
                return False
    
    def upsert_tag(self, tag: Dict[str, Any]) -> bool:
        """Insert or update tag definition"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO tag_definitions 
                    (id, plc_id, tag_name, address, data_type, scan_class, active,
                     description, unit, scaling_enabled, scale_factor, offset,
                     min_value, max_value, deadband, log_enabled, alarm_enabled,
                     alarm_config, portal_sync, local_only, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    tag['id'],
                    tag['plc_id'],
                    tag['tag_name'],
                    tag['address'],
                    tag.get('data_type', 'REAL'),
                    tag.get('scan_class', 'default'),
                    tag.get('active', True),
                    tag.get('description'),
                    tag.get('unit'),
                    tag.get('scaling_enabled', False),
                    tag.get('scale_factor', 1.0),
                    tag.get('offset', 0.0),
                    tag.get('min_value'),
                    tag.get('max_value'),
                    tag.get('deadband', 0.0),
                    tag.get('log_enabled', True),
                    tag.get('alarm_enabled', False),
                    json.dumps(tag.get('alarm_config', {})) if tag.get('alarm_config') else None,
                    tag.get('portal_sync', True),
                    tag.get('local_only', False)
                ))
                
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Failed to save tag {tag.get('id')}: {e}")
                return False
    
    def get_tags(self, plc_id: str = None, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get tag definitions"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                query = 'SELECT * FROM tag_definitions WHERE 1=1'
                params = []
                
                if plc_id:
                    query += ' AND plc_id = ?'
                    params.append(plc_id)
                
                if active_only:
                    query += ' AND active = 1'
                
                query += ' ORDER BY tag_name'
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                conn.close()
                
                tags = []
                for row in rows:
                    tags.append({
                        'id': row['id'],
                        'plc_id': row['plc_id'],
                        'tag_name': row['tag_name'],
                        'address': row['address'],
                        'data_type': row['data_type'],
                        'scan_class': row['scan_class'],
                        'active': bool(row['active']),
                        'description': row['description'],
                        'unit': row['unit'],
                        'scaling_enabled': bool(row['scaling_enabled']),
                        'scale_factor': row['scale_factor'],
                        'offset': row['offset'],
                        'min_value': row['min_value'],
                        'max_value': row['max_value'],
                        'deadband': row['deadband'],
                        'log_enabled': bool(row['log_enabled']),
                        'alarm_enabled': bool(row['alarm_enabled']),
                        'alarm_config': json.loads(row['alarm_config']) if row['alarm_config'] else None,
                        'last_value': row['last_value'],
                        'last_quality': row['last_quality'],
                        'last_timestamp': row['last_timestamp']
                    })
                
                return tags
            except Exception as e:
                logger.error(f"Failed to get tags: {e}")
                return []
    
    def update_tag_value(self, tag_id: str, value: float, quality: int) -> bool:
        """Update tag's last value and log to history"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Update tag's last value
                cursor.execute('''
                    UPDATE tag_definitions 
                    SET last_value = ?, last_quality = ?, last_timestamp = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (value, quality, tag_id))
                
                # Check if logging is enabled
                cursor.execute('SELECT log_enabled FROM tag_definitions WHERE id = ?', (tag_id,))
                row = cursor.fetchone()
                
                if row and row[0]:
                    # Log to history
                    cursor.execute('''
                        INSERT INTO tag_history (tag_id, value, quality)
                        VALUES (?, ?, ?)
                    ''', (tag_id, value, quality))
                
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Failed to update tag value: {e}")
                return False
    
    def get_unsynced_data(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get historical data that hasn't been uploaded"""
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT h.*, t.tag_name, t.plc_id
                    FROM tag_history h
                    JOIN tag_definitions t ON h.tag_id = t.id
                    WHERE h.uploaded = 0
                    ORDER BY h.timestamp
                    LIMIT ?
                ''', (limit,))
                
                rows = cursor.fetchall()
                conn.close()
                
                data = []
                for row in rows:
                    data.append({
                        'id': row['id'],
                        'tag_id': row['tag_id'],
                        'tag_name': row['tag_name'],
                        'plc_id': row['plc_id'],
                        'value': row['value'],
                        'quality': row['quality'],
                        'timestamp': row['timestamp']
                    })
                
                return data
            except Exception as e:
                logger.error(f"Failed to get unsynced data: {e}")
                return []
    
    def mark_data_synced(self, ids: List[int]) -> bool:
        """Mark historical data as uploaded"""
        if not ids:
            return True
            
        with self.lock:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                placeholders = ','.join('?' * len(ids))
                cursor.execute(
                    f"UPDATE tag_history SET uploaded = 1 WHERE id IN ({placeholders})",
                    ids
                )
                
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Failed to mark data as synced: {e}")
                return False
    
    def sync_with_portal(self, portal_config: Dict[str, Any]) -> Dict[str, int]:
        """Sync configuration with portal"""
        stats = {'plcs_added': 0, 'plcs_updated': 0, 'tags_added': 0, 'tags_updated': 0}
        
        # Sync PLCs
        for plc in portal_config.get('plcs', []):
            plc['portal_sync'] = True
            if self.upsert_plc(plc):
                stats['plcs_updated'] += 1
        
        # Sync tags
        for plc in portal_config.get('plcs', []):
            for tag in plc.get('tags', []):
                tag['plc_id'] = plc['id']
                tag['portal_sync'] = True
                if self.upsert_tag(tag):
                    stats['tags_updated'] += 1
        
        # Update last sync time
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('UPDATE gateway_config SET last_sync = CURRENT_TIMESTAMP WHERE id = 1')
            conn.commit()
            conn.close()
        
        logger.info(f"Portal sync complete: {stats}")
        return stats
    
    def export_configuration(self) -> Dict[str, Any]:
        """Export complete configuration for backup"""
        config = {
            'gateway': self.get_gateway_config(),
            'plcs': self.get_plcs(enabled_only=False),
            'tags': self.get_tags(active_only=False),
            'export_date': datetime.now().isoformat()
        }
        return config
    
    def import_configuration(self, config: Dict[str, Any]) -> bool:
        """Import configuration from backup"""
        try:
            # Import PLCs
            for plc in config.get('plcs', []):
                self.upsert_plc(plc)
            
            # Import tags
            for tag in config.get('tags', []):
                self.upsert_tag(tag)
            
            logger.info("Configuration imported successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to import configuration: {e}")
            return False