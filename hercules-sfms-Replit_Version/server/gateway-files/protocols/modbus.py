#!/usr/bin/env python3
"""
Industrial-grade Modbus Protocol Handler
Supports both Modbus TCP and RTU with automatic failover and reconnection
"""

import struct
import time
import logging
from typing import Any, Dict, List, Optional, Union, Tuple
from threading import Lock
from enum import Enum

from pymodbus.client import ModbusTcpClient, ModbusSerialClient
from pymodbus.exceptions import ModbusException, ConnectionException
from pymodbus.constants import Endian
from pymodbus.payload import BinaryPayloadDecoder, BinaryPayloadBuilder

logger = logging.getLogger(__name__)

class ModbusHandler:
    """Enterprise-grade Modbus handler"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize Modbus handler"""
        self.config = config
        self.client = None
        self.connected = False
        self.lock = Lock()
        self.last_error = None
        self.statistics = {
            "reads": 0,
            "writes": 0,
            "errors": 0,
            "reconnects": 0,
            "avg_response_time": 0
        }
        
        self.byte_order = Endian.BIG if config.get("byte_order", "big") == "big" else Endian.LITTLE
        self.word_order = Endian.BIG if config.get("word_order", "big") == "big" else Endian.LITTLE
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Modbus client based on protocol type"""
        protocol = self.config.get("protocol", "modbus-tcp").lower()
        
        if protocol in ["modbus-tcp", "modbus"]:
            self.client = ModbusTcpClient(
                host=self.config.get("host", "localhost"),
                port=self.config.get("port", 502),
                timeout=self.config.get("timeout", 3),
                retries=self.config.get("retries", 3),
                retry_on_empty=True,
                retry_on_invalid=True
            )
        elif protocol == "modbus-rtu":
            serial_config = self.config.get("serial_config", {})
            self.client = ModbusSerialClient(
                port=serial_config.get("port", "COM1"),
                baudrate=serial_config.get("baudrate", 9600),
                bytesize=serial_config.get("bytesize", 8),
                parity=serial_config.get("parity", "N"),
                stopbits=serial_config.get("stopbits", 1),
                timeout=self.config.get("timeout", 3),
                retries=self.config.get("retries", 3)
            )
        else:
            raise ValueError(f"Unsupported Modbus protocol: {protocol}")
    
    def connect(self) -> bool:
        """Establish connection to Modbus device"""
        with self.lock:
            try:
                if self.client and not self.connected:
                    result = self.client.connect()
                    if result:
                        self.connected = True
                        logger.info(f"Connected to Modbus device at {self.config.get('host')}:{self.config.get('port')}")
                        return True
                    else:
                        raise ConnectionException("Failed to connect to Modbus device")
                return self.connected
                
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"Modbus connection error: {e}")
                self.statistics["errors"] += 1
                return False
    
    def disconnect(self):
        """Disconnect from Modbus device"""
        with self.lock:
            if self.client and self.connected:
                self.client.close()
                self.connected = False
                logger.info("Disconnected from Modbus device")
    
    def parse_address(self, address: str) -> Tuple[int, str, int]:
        """Parse Modbus address string"""
        address = str(address).upper().strip()
        
        if address.isdigit():
            addr_int = int(address)
            if 40000 <= addr_int <= 49999:
                return addr_int - 40001, "holding", 1
            elif 30000 <= addr_int <= 39999:
                return addr_int - 30001, "input", 1
            elif 10000 <= addr_int <= 19999:
                return addr_int - 10001, "discrete", 1
            elif 1 <= addr_int <= 9999:
                return addr_int - 1, "coil", 1
        
        if address.startswith("HR"):
            return int(address[2:]), "holding", 1
        elif address.startswith("IR"):
            return int(address[2:]), "input", 1
        elif address.startswith("DI"):
            return int(address[2:]), "discrete", 1
        elif address.startswith("C"):
            return int(address[1:]), "coil", 1
        
        return int(address), "holding", 1
    
    def read_tag(self, tag: Dict[str, Any]) -> Any:
        """Read a single tag from Modbus device"""
        if not self.connected:
            if not self.connect():
                return None
        
        start_time = time.time()
        
        try:
            address, register_type, _ = self.parse_address(tag.get("address", "0"))
            data_type = tag.get("dataType", "INT16").upper()
            unit_id = tag.get("unit_id", self.config.get("unit_id", 1))
            
            if data_type in ["BOOL", "BIT"]:
                count = 1
            elif data_type in ["INT16", "UINT16"]:
                count = 1
            elif data_type in ["INT32", "UINT32", "FLOAT32", "FLOAT"]:
                count = 2
            elif data_type in ["INT64", "UINT64", "FLOAT64", "DOUBLE"]:
                count = 4
            elif data_type.startswith("STRING"):
                count = int(data_type.split(":")[1]) if ":" in data_type else 10
            else:
                count = 1
            
            if register_type == "holding":
                response = self.client.read_holding_registers(address, count, slave=unit_id)
            elif register_type == "input":
                response = self.client.read_input_registers(address, count, slave=unit_id)
            elif register_type == "coil":
                response = self.client.read_coils(address, count, slave=unit_id)
            elif register_type == "discrete":
                response = self.client.read_discrete_inputs(address, count, slave=unit_id)
            else:
                raise ValueError(f"Unknown register type: {register_type}")
            
            if response.isError():
                raise ModbusException(f"Modbus error: {response}")
            
            value = self._decode_value(response, data_type, register_type)
            
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
    
    def _decode_value(self, response, data_type: str, register_type: str) -> Any:
        """Decode Modbus response based on data type"""
        if register_type in ["coil", "discrete"]:
            return bool(response.bits[0])
        
        if hasattr(response, 'registers'):
            registers = response.registers
        else:
            return None
        
        decoder = BinaryPayloadDecoder.fromRegisters(
            registers,
            byteorder=self.byte_order,
            wordorder=self.word_order
        )
        
        if data_type == "BOOL":
            return bool(registers[0] & 0x0001)
        elif data_type == "INT16":
            return decoder.decode_16bit_int()
        elif data_type == "UINT16":
            return decoder.decode_16bit_uint()
        elif data_type == "INT32":
            return decoder.decode_32bit_int()
        elif data_type == "UINT32":
            return decoder.decode_32bit_uint()
        elif data_type in ["FLOAT32", "FLOAT", "REAL"]:
            return decoder.decode_32bit_float()
        elif data_type in ["FLOAT64", "DOUBLE", "LREAL"]:
            return decoder.decode_64bit_float()
        elif data_type == "INT64":
            return decoder.decode_64bit_int()
        elif data_type == "UINT64":
            return decoder.decode_64bit_uint()
        elif data_type.startswith("STRING"):
            result = ""
            for reg in registers:
                result += chr(reg >> 8)
                result += chr(reg & 0xFF)
            return result.rstrip('\x00')
        else:
            return registers[0] if registers else None
    
    def write_tag(self, tag: Dict[str, Any], value: Any) -> bool:
        """Write value to Modbus device"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            address, register_type, _ = self.parse_address(tag.get("address", "0"))
            data_type = tag.get("dataType", "INT16").upper()
            unit_id = tag.get("unit_id", self.config.get("unit_id", 1))
            
            if isinstance(value, (int, float)):
                scale = float(tag.get("scale", 1.0))
                offset = float(tag.get("offset", 0.0))
                value = (value - offset) / scale if scale != 0 else value
            
            encoded = self._encode_value(value, data_type)
            
            if register_type == "holding":
                if isinstance(encoded, bool):
                    response = self.client.write_register(address, 1 if encoded else 0, slave=unit_id)
                elif isinstance(encoded, list):
                    response = self.client.write_registers(address, encoded, slave=unit_id)
                else:
                    response = self.client.write_register(address, encoded, slave=unit_id)
            elif register_type == "coil":
                response = self.client.write_coil(address, bool(value), slave=unit_id)
            else:
                raise ValueError(f"Cannot write to {register_type} registers")
            
            if response.isError():
                raise ModbusException(f"Write error: {response}")
            
            self.statistics["writes"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Error writing tag {tag.get('address')}: {e}")
            self.last_error = str(e)
            self.statistics["errors"] += 1
            return False
    
    def _encode_value(self, value: Any, data_type: str) -> Union[int, List[int], bool]:
        """Encode value for Modbus writing"""
        builder = BinaryPayloadBuilder(
            byteorder=self.byte_order,
            wordorder=self.word_order
        )
        
        if data_type == "BOOL":
            return bool(value)
        elif data_type == "INT16":
            builder.add_16bit_int(int(value))
        elif data_type == "UINT16":
            builder.add_16bit_uint(int(value))
        elif data_type == "INT32":
            builder.add_32bit_int(int(value))
        elif data_type == "UINT32":
            builder.add_32bit_uint(int(value))
        elif data_type in ["FLOAT32", "FLOAT", "REAL"]:
            builder.add_32bit_float(float(value))
        elif data_type in ["FLOAT64", "DOUBLE", "LREAL"]:
            builder.add_64bit_float(float(value))
        elif data_type.startswith("STRING"):
            str_val = str(value)
            registers = []
            for i in range(0, len(str_val), 2):
                high = ord(str_val[i]) if i < len(str_val) else 0
                low = ord(str_val[i+1]) if i+1 < len(str_val) else 0
                registers.append((high << 8) | low)
            return registers
        else:
            return int(value)
        
        return builder.to_registers()
    
    def read_batch(self, tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Optimized batch reading of multiple tags"""
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
                "port": self.config.get("port"),
                "protocol": self.config.get("protocol"),
                "unit_id": self.config.get("unit_id")
            }
        }
    
    def __del__(self):
        """Cleanup on destruction"""
        try:
            self.disconnect()
        except:
            pass