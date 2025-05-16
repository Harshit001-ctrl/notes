'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ConnectivityIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <Badge variant={isOnline ? 'default' : 'destructive'} className="flex items-center gap-2">
      {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </Badge>
  );
}
