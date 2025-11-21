#!/usr/bin/env python3
"""
OPC-UA Protocol Handler
Industry 4.0 standard for industrial communication
"""

import time
import logging
from typing import Any, Dict, List, Tuple
from threading import Lock

from opcua import Client, ua
from opcua.common.subscription import SubHandler

logger = logging.getLogger(__name__)

class OPCUAHandler:
    """Enterprise-grade OPC-UA handler"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize OPC-UA handler"""
        self.config = config
        self.client = None
        self.connected = False
        self.lock = Lock()
        self.last_error = None
        self.subscription = None
        self.handles = {}
        self.statistics = {
            "reads": 0,
            "writes": 0,
            "errors": 0,
            "reconnects": 0,
            "avg_response_time": 0
        }
        
        self.endpoint = config.get("endpoint", f"opc.tcp://{config.get('host', 'localhost')}:4840")
        self.security_policy = config.get("security_policy", None)
        self.username = config.get("username", None)
        self.password = config.get("password", None)
    
    def connect(self) -> bool:
        """Establish connection to OPC-UA server"""
        with self.lock:
            try:
                if not self.connected:
                    self.client = Client(self.endpoint)
                    
                    if self.username and self.password:
                        self.client.set_user(self.username)
                        self.client.set_password(self.password)
                    
                    if self.security_policy:
                        self.client.set_security_string(self.security_policy)
                    
                    self.client.connect()
                    
                    root = self.client.get_root_node()
                    logger.info(f"Connected to OPC-UA server: {root}")
                    
                    if self.config.get("subscription_enabled", False):
                        self._setup_subscription()
                    
                    self.connected = True
                    return True
                    
                return self.connected
                
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"OPC-UA connection error: {e}")
                self.statistics["errors"] += 1
                return False
    
    def disconnect(self):
        """Disconnect from OPC-UA server"""
        with self.lock:
            if self.client and self.connected:
                try:
                    if self.subscription:
                        self.subscription.delete()
                    self.client.disconnect()
                    self.connected = False
                    logger.info("Disconnected from OPC-UA server")
                except:
                    pass
    
    def _setup_subscription(self):
        """Setup subscription for real-time updates"""
        try:
            self.subscription = self.client.create_subscription(500, self)
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
    
    def parse_address(self, address: str) -> ua.NodeId:
        """
        Parse OPC-UA node address
        Supports: ns=2;i=1234, ns=2;s=MyVariable, i=2258
        """
        address = address.strip()
        
        if address.startswith("ns="):
            return ua.NodeId.from_string(address)
        elif address.startswith("i="):
            return ua.NodeId(int(address[2:]), 0)
        else:
            try:
                return ua.NodeId(int(address), 0)
            except:
                return ua.NodeId(address, 2)
    
    def read_tag(self, tag: Dict[str, Any]) -> Any:
        """Read a single tag from OPC-UA server"""
        if not self.connected:
            if not self.connect():
                return None
        
        start_time = time.time()
        
        try:
            address = tag.get("address", "")
            node_id = self.parse_address(address)
            
            node = self.client.get_node(node_id)
            value = node.get_value()
            
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
        """Write value to OPC-UA server"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            address = tag.get("address", "")
            node_id = self.parse_address(address)
            data_type = tag.get("dataType", "").upper()
            
            if isinstance(value, (int, float)):
                scale = float(tag.get("scale", 1.0))
                offset = float(tag.get("offset", 0.0))
                value = (value - offset) / scale if scale != 0 else value
            
            node = self.client.get_node(node_id)
            
            variant_type = self._get_variant_type(data_type)
            if variant_type:
                dv = ua.DataValue(ua.Variant(value, variant_type))
            else:
                dv = ua.DataValue(ua.Variant(value))
            
            node.set_value(dv)
            
            self.statistics["writes"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Error writing tag {tag.get('address')}: {e}")
            self.last_error = str(e)
            self.statistics["errors"] += 1
            return False
    
    def _get_variant_type(self, data_type: str):
        """Get OPC-UA variant type from data type string"""
        type_map = {
            "BOOL": ua.VariantType.Boolean,
            "BYTE": ua.VariantType.Byte,
            "INT16": ua.VariantType.Int16,
            "UINT16": ua.VariantType.UInt16,
            "INT32": ua.VariantType.Int32,
            "UINT32": ua.VariantType.UInt32,
            "INT64": ua.VariantType.Int64,
            "UINT64": ua.VariantType.UInt64,
            "FLOAT": ua.VariantType.Float,
            "DOUBLE": ua.VariantType.Double,
            "STRING": ua.VariantType.String
        }
        return type_map.get(data_type)
    
    def read_batch(self, tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch reading of multiple tags"""
        if not self.connected:
            if not self.connect():
                return {}
        
        results = {}
        nodes_to_read = []
        tag_map = {}
        
        for tag in tags:
            address = tag.get("address", "")
            node_id = self.parse_address(address)
            node = self.client.get_node(node_id)
            nodes_to_read.append(node)
            tag_map[str(node_id)] = tag
        
        try:
            values = self.client.get_values(nodes_to_read)
            
            for i, value in enumerate(values):
                tag = tags[i]
                
                if value is not None and isinstance(value, (int, float)):
                    scale = float(tag.get("scale", 1.0))
                    offset = float(tag.get("offset", 0.0))
                    value = (value * scale) + offset
                
                results[tag.get("id", tag.get("address"))] = value
                
        except Exception as e:
            logger.error(f"Batch read error: {e}")
            for tag in tags:
                results[tag.get("id", tag.get("address"))] = None
        
        return results
    
    def browse_nodes(self, start_node=None) -> List[Dict[str, Any]]:
        """Browse available nodes in OPC-UA server"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            if start_node is None:
                start_node = self.client.get_objects_node()
            
            nodes = []
            for child in start_node.get_children():
                try:
                    node_class = child.get_node_class()
                    if node_class == ua.NodeClass.Variable:
                        nodes.append({
                            "id": str(child.nodeid),
                            "name": child.get_browse_name().Name,
                            "value": child.get_value(),
                            "data_type": str(child.get_data_type())
                        })
                except:
                    pass
            
            return nodes
            
        except Exception as e:
            logger.error(f"Browse error: {e}")
            return []
    
    def get_diagnostics(self) -> Dict[str, Any]:
        """Get diagnostic information"""
        return {
            "connected": self.connected,
            "last_error": self.last_error,
            "statistics": self.statistics.copy(),
            "config": {
                "endpoint": self.endpoint,
                "security_policy": self.security_policy,
                "subscription_enabled": self.config.get("subscription_enabled", False)
            }
        }
    
    def datachange_notification(self, node, val, data):
        """Handle data change notifications from subscription"""
        logger.debug(f"Data change: Node {node}, Value {val}")
    
    def __del__(self):
        """Cleanup on destruction"""
        try:
            self.disconnect()
        except:
            pass