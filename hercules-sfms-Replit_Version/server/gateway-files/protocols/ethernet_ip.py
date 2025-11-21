#!/usr/bin/env python3
"""
Allen-Bradley EtherNet/IP Protocol Handler
Supports ControlLogix, CompactLogix, Micro800 PLCs
"""

import time
import logging
from typing import Any, Dict, List, Tuple
from threading import Lock

from pycomm3 import LogixDriver, CIPDriver
from pycomm3.exceptions import CommError, ResponseError

logger = logging.getLogger(__name__)

class EthernetIPHandler:
    """Enterprise-grade EtherNet/IP handler for Allen-Bradley PLCs"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize EtherNet/IP handler"""
        self.config = config
        self.driver = None
        self.connected = False
        self.lock = Lock()
        self.last_error = None
        self.tag_list = []
        self.statistics = {
            "reads": 0,
            "writes": 0,
            "errors": 0,
            "reconnects": 0,
            "avg_response_time": 0
        }
        
        self.plc_type = config.get("plc_type", "ControlLogix").lower()
        self.slot = config.get("slot", 0)
    
    def connect(self) -> bool:
        """Establish connection to Allen-Bradley PLC"""
        with self.lock:
            try:
                if not self.connected:
                    host = self.config.get("host")
                    
                    if "micro" in self.plc_type:
                        self.driver = CIPDriver(host)
                    else:
                        self.driver = LogixDriver(
                            host,
                            slot=self.slot,
                            timeout=self.config.get("timeout", 10),
                            large_packets=self.config.get("large_packets", True)
                        )
                    
                    self.driver.open()
                    
                    info = self.driver.get_plc_info()
                    logger.info(f"Connected to Allen-Bradley PLC: {info}")
                    
                    if hasattr(self.driver, 'get_tag_list'):
                        self.tag_list = self.driver.get_tag_list()
                    
                    self.connected = True
                    return True
                    
                return self.connected
                
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"EtherNet/IP connection error: {e}")
                self.statistics["errors"] += 1
                return False
    
    def disconnect(self):
        """Disconnect from Allen-Bradley PLC"""
        with self.lock:
            if self.driver and self.connected:
                try:
                    self.driver.close()
                    self.connected = False
                    logger.info("Disconnected from Allen-Bradley PLC")
                except:
                    pass
    
    def parse_address(self, address: str) -> Tuple[str, int]:
        """
        Parse Allen-Bradley tag address
        Supports: TagName, TagName[0], Program:MainProgram.TagName
        """
        address = address.strip()
        
        array_index = None
        if "[" in address and "]" in address:
            tag_name = address[:address.index("[")]
            array_index = int(address[address.index("[")+1:address.index("]")])
        else:
            tag_name = address
        
        return tag_name, array_index
    
    def read_tag(self, tag: Dict[str, Any]) -> Any:
        """Read a single tag from Allen-Bradley PLC"""
        if not self.connected:
            if not self.connect():
                return None
        
        start_time = time.time()
        
        try:
            address = tag.get("address", "")
            tag_name, array_index = self.parse_address(address)
            
            result = self.driver.read(tag_name)
            
            if result.error:
                raise ResponseError(f"Read error: {result.error}")
            
            value = result.value
            
            if array_index is not None and isinstance(value, (list, tuple)):
                value = value[array_index]
            
            if isinstance(value, (int, float)):
                scale = float(tag.get("scale", 1.0))
                offset = float(tag.get("offset", 0.0))
                value = (value * scale) + offset
            
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
    
    def write_tag(self, tag: Dict[str, Any], value: Any) -> bool:
        """Write value to Allen-Bradley PLC"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            address = tag.get("address", "")
            tag_name, array_index = self.parse_address(address)
            
            if isinstance(value, (int, float)):
                scale = float(tag.get("scale", 1.0))
                offset = float(tag.get("offset", 0.0))
                value = (value - offset) / scale if scale != 0 else value
            
            if array_index is not None:
                current = self.driver.read(tag_name)
                if current.value and isinstance(current.value, list):
                    current.value[array_index] = value
                    value = current.value
            
            result = self.driver.write(tag_name, value)
            
            if result.error:
                raise ResponseError(f"Write error: {result.error}")
            
            self.statistics["writes"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Error writing tag {tag.get('address')}: {e}")
            self.last_error = str(e)
            self.statistics["errors"] += 1
            return False
    
    def read_batch(self, tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch reading of multiple tags - optimized for Allen-Bradley"""
        if not self.connected:
            if not self.connect():
                return {}
        
        results = {}
        tag_names = []
        tag_map = {}
        
        for tag in tags:
            address = tag.get("address", "")
            tag_name, _ = self.parse_address(address)
            tag_names.append(tag_name)
            tag_map[tag_name] = tag
        
        try:
            if len(tag_names) > 1:
                batch_result = self.driver.read(*tag_names)
                
                if isinstance(batch_result, list):
                    for i, result in enumerate(batch_result):
                        tag = tag_map.get(tag_names[i])
                        if tag and not result.error:
                            value = result.value
                            
                            if isinstance(value, (int, float)):
                                scale = float(tag.get("scale", 1.0))
                                offset = float(tag.get("offset", 0.0))
                                value = (value * scale) + offset
                            
                            results[tag.get("id", tag.get("address"))] = value
                        else:
                            results[tag.get("id", tag.get("address"))] = None
                else:
                    for tag in tags:
                        value = self.read_tag(tag)
                        results[tag.get("id", tag.get("address"))] = value
            else:
                for tag in tags:
                    value = self.read_tag(tag)
                    results[tag.get("id", tag.get("address"))] = value
                    
        except Exception as e:
            logger.error(f"Batch read error: {e}")
            for tag in tags:
                results[tag.get("id", tag.get("address"))] = None
        
        return results
    
    def get_diagnostics(self) -> Dict[str, Any]:
        """Get diagnostic information"""
        return {
            "connected": self.connected,
            "last_error": self.last_error,
            "statistics": self.statistics.copy(),
            "config": {
                "host": self.config.get("host"),
                "plc_type": self.plc_type,
                "slot": self.slot
            },
            "tag_count": len(self.tag_list)
        }
    
    def __del__(self):
        """Cleanup on destruction"""
        try:
            self.disconnect()
        except:
            pass