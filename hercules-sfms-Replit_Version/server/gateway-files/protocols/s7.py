#!/usr/bin/env python3
"""
Industrial-grade Siemens S7 Protocol Handler
Supports S7-300, S7-400, S7-1200, S7-1500 PLCs
"""

import time
import logging
from typing import Any, Dict, List, Tuple
from threading import Lock

import snap7
from snap7.util import get_bool, set_bool, get_int, set_int, get_real, set_real, get_dword, set_dword
from snap7.util import get_string, set_string

logger = logging.getLogger(__name__)

class S7Handler:
    """Enterprise-grade S7 handler"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize S7 handler"""
        self.config = config
        self.client = snap7.client.Client()
        self.connected = False
        self.lock = Lock()
        self.last_error = None
        self.db_cache = {}
        self.cache_ttl = 100
        self.last_cache_time = {}
        
        self.statistics = {
            "reads": 0,
            "writes": 0,
            "errors": 0,
            "reconnects": 0,
            "avg_response_time": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        
        self._configure_plc_type()
    
    def _configure_plc_type(self):
        """Configure client based on PLC type"""
        plc_type = self.config.get("plc_type", "S7-1200").upper()
        
        if plc_type in ["S7-1200", "S7-1500"]:
            self.client.set_connection_type(self.config.get("connection_type", 3))
        else:
            self.client.set_connection_type(self.config.get("connection_type", 2))
    
    def connect(self) -> bool:
        """Establish connection to S7 PLC"""
        with self.lock:
            try:
                if not self.connected:
                    self.client.connect(
                        self.config.get("host"),
                        self.config.get("rack", 0),
                        self.config.get("slot", 2)
                    )
                    
                    state = self.client.get_cpu_state()
                    logger.info(f"Connected to S7 PLC at {self.config.get('host')} - CPU State: {state}")
                    
                    self.connected = True
                    return True
                    
                return self.connected
                
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"S7 connection error: {e}")
                self.statistics["errors"] += 1
                return False
    
    def disconnect(self):
        """Disconnect from S7 PLC"""
        with self.lock:
            if self.connected:
                try:
                    self.client.disconnect()
                    self.connected = False
                    logger.info("Disconnected from S7 PLC")
                except:
                    pass
    
    def parse_address(self, address: str) -> Tuple[str, int, int, int, str]:
        """Parse S7 address string"""
        address = address.upper().strip()
        
        if address.startswith("DB"):
            parts = address.split(".")
            db_num = int(parts[0][2:])
            
            if len(parts) >= 2:
                offset_part = parts[1]
                
                if offset_part.startswith("DBX"):
                    offset = int(offset_part[3:])
                    bit = int(parts[2]) if len(parts) > 2 else 0
                    return "DB", db_num, offset, bit, "BOOL"
                elif offset_part.startswith("DBB"):
                    offset = int(offset_part[3:])
                    return "DB", db_num, offset, 0, "BYTE"
                elif offset_part.startswith("DBW"):
                    offset = int(offset_part[3:])
                    return "DB", db_num, offset, 0, "WORD"
                elif offset_part.startswith("DBD"):
                    offset = int(offset_part[3:])
                    return "DB", db_num, offset, 0, "DWORD"
                elif offset_part.startswith("DBR"):
                    offset = int(offset_part[3:])
                    return "DB", db_num, offset, 0, "REAL"
                elif offset_part.startswith("DBS"):
                    offset = int(offset_part[3:])
                    return "DB", db_num, offset, 0, "STRING"
            
            return "DB", db_num, 0, 0, "BYTE"
        
        elif address.startswith("M"):
            if address[1] == "B":
                return "MK", 0, int(address[2:]), 0, "BYTE"
            elif address[1] == "W":
                return "MK", 0, int(address[2:]), 0, "WORD"
            elif address[1] == "D":
                return "MK", 0, int(address[2:]), 0, "DWORD"
            elif address[1] == "R":
                return "MK", 0, int(address[2:]), 0, "REAL"
            else:
                parts = address[1:].split(".")
                return "MK", 0, int(parts[0]), int(parts[1]) if len(parts) > 1 else 0, "BOOL"
        
        elif address.startswith("I"):
            if address[1] == "B":
                return "PE", 0, int(address[2:]), 0, "BYTE"
            elif address[1] == "W":
                return "PE", 0, int(address[2:]), 0, "WORD"
            elif address[1] == "D":
                return "PE", 0, int(address[2:]), 0, "DWORD"
            else:
                parts = address[1:].split(".")
                return "PE", 0, int(parts[0]), int(parts[1]) if len(parts) > 1 else 0, "BOOL"
        
        elif address.startswith("Q"):
            if address[1] == "B":
                return "PA", 0, int(address[2:]), 0, "BYTE"
            elif address[1] == "W":
                return "PA", 0, int(address[2:]), 0, "WORD"
            elif address[1] == "D":
                return "PA", 0, int(address[2:]), 0, "DWORD"
            else:
                parts = address[1:].split(".")
                return "PA", 0, int(parts[0]), int(parts[1]) if len(parts) > 1 else 0, "BOOL"
        
        return "DB", 1, 0, 0, "BYTE"
    
    def read_tag(self, tag: Dict[str, Any]) -> Any:
        """Read a single tag from S7 PLC"""
        if not self.connected:
            if not self.connect():
                return None
        
        start_time = time.time()
        
        try:
            area, db_num, offset, bit, s7_type = self.parse_address(tag.get("address", "DB1.DBB0"))
            data_type = tag.get("dataType", s7_type).upper()
            
            if area == "DB":
                size = self._get_data_size(data_type)
                data = self.client.db_read(db_num, offset, size)
            elif area == "MK":
                size = self._get_data_size(data_type)
                data = self.client.mk_read(offset, size)
            elif area == "PE":
                size = self._get_data_size(data_type)
                data = self.client.pe_read(offset, size)
            elif area == "PA":
                size = self._get_data_size(data_type)
                data = self.client.pa_read(offset, size)
            else:
                return None
            
            value = self._decode_value(data, data_type, offset, bit)
            
            if isinstance(value, (int, float)):
                scale = float(tag.get("scale", 1.0))
                offset_val = float(tag.get("offset", 0.0))
                value = (value * scale) + offset_val
            
            self.statistics["reads"] += 1
            response_time = time.time() - start_time
            self.statistics["avg_response_time"] = (
                (self.statistics["avg_response_time"] * (self.statistics["reads"] - 1) + response_time) 
                / self.statistics["reads"]
            )
            
            return value
            
        except Exception as e:
            logger.error(f"Error reading tag {tag.get('address')}: {e}")
            self.last_error = str(e)
            self.statistics["errors"] += 1
            
            if "connection" in str(e).lower():
                self.connected = False
            
            return None
    
    def _get_data_size(self, data_type: str) -> int:
        """Get size in bytes for data type"""
        sizes = {
            "BOOL": 1,
            "BYTE": 1,
            "WORD": 2,
            "DWORD": 4,
            "INT": 2,
            "DINT": 4,
            "REAL": 4,
            "CHAR": 1,
            "TIME": 4,
            "DATE": 2
        }
        
        if data_type.startswith("STRING"):
            if ":" in data_type:
                return int(data_type.split(":")[1])
            return 256
        
        return sizes.get(data_type, 1)
    
    def _decode_value(self, data: bytearray, data_type: str, offset: int, bit: int) -> Any:
        """Decode S7 data based on type"""
        if data_type == "BOOL":
            return get_bool(data, 0, bit)
        elif data_type == "BYTE":
            return data[0]
        elif data_type == "WORD":
            return int.from_bytes(data[0:2], byteorder='big')
        elif data_type == "DWORD":
            return get_dword(data, 0)
        elif data_type == "INT":
            return get_int(data, 0)
        elif data_type == "DINT":
            return int.from_bytes(data[0:4], byteorder='big', signed=True)
        elif data_type in ["REAL", "FLOAT"]:
            return get_real(data, 0)
        elif data_type.startswith("STRING"):
            return get_string(data, 0, len(data))
        else:
            return data[0]
    
    def write_tag(self, tag: Dict[str, Any], value: Any) -> bool:
        """Write value to S7 PLC"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            area, db_num, offset, bit, s7_type = self.parse_address(tag.get("address", "DB1.DBB0"))
            data_type = tag.get("dataType", s7_type).upper()
            
            if isinstance(value, (int, float)):
                scale = float(tag.get("scale", 1.0))
                offset_val = float(tag.get("offset", 0.0))
                value = (value - offset_val) / scale if scale != 0 else value
            
            data = self._encode_value(value, data_type, bit)
            
            if area == "DB":
                self.client.db_write(db_num, offset, data)
            elif area == "MK":
                self.client.mk_write(offset, data)
            elif area == "PA":
                self.client.pa_write(offset, data)
            else:
                raise ValueError(f"Cannot write to {area} area")
            
            self.statistics["writes"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Error writing tag {tag.get('address')}: {e}")
            self.last_error = str(e)
            self.statistics["errors"] += 1
            return False
    
    def _encode_value(self, value: Any, data_type: str, bit: int) -> bytearray:
        """Encode value for S7 writing"""
        size = self._get_data_size(data_type)
        data = bytearray(size)
        
        if data_type == "BOOL":
            set_bool(data, 0, bit, bool(value))
        elif data_type == "BYTE":
            data[0] = int(value) & 0xFF
        elif data_type == "WORD":
            val = int(value) & 0xFFFF
            data[0:2] = val.to_bytes(2, byteorder='big')
        elif data_type == "DWORD":
            set_dword(data, 0, int(value))
        elif data_type == "INT":
            set_int(data, 0, int(value))
        elif data_type == "DINT":
            val = int(value)
            data[0:4] = val.to_bytes(4, byteorder='big', signed=True)
        elif data_type in ["REAL", "FLOAT"]:
            set_real(data, 0, float(value))
        elif data_type.startswith("STRING"):
            set_string(data, 0, str(value), size)
        
        return data
    
    def read_batch(self, tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch reading of multiple tags"""
        results = {}
        
        for tag in tags:
            value = self.read_tag(tag)
            results[tag.get("id", tag.get("address"))] = value
        
        return results
    
    def get_diagnostics(self) -> Dict[str, Any]:
        """Get diagnostic information"""
        return {
            "connected": self.connected,
            "last_error": self.last_error,
            "statistics": self.statistics.copy(),
            "config": {
                "host": self.config.get("host"),
                "rack": self.config.get("rack"),
                "slot": self.config.get("slot"),
                "plc_type": self.config.get("plc_type")
            }
        }
    
    def __del__(self):
        """Cleanup on destruction"""
        try:
            self.disconnect()
        except:
            pass