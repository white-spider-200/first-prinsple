import React from 'react';
import { NodeData } from '../types';
import NodeCard from './NodeCard';

interface TreeVisualizerProps {
  node: NodeData;
  onExpand: