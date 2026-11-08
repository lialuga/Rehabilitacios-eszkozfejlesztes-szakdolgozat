import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';
import {DataStatus} from '../hooks/useDataStatus';
import {useT} from '../hooks/useT';
import {useConnectionStore} from '../store/connectionStore';
import {useLiveStore} from '../store/liveStore';
import {Icon} from './Icon';
import {PulseDot} from './PulseDot';

const dotColor: Record<DataStatus, string> = {
  live: Colors.accent,
  demo: Colors.violet,
  stale: Colors.warning,
  offline: Colors.textTertiary,
};

export const StatusPill = ({status}: {status: DataStatus}) => {
  const t = useT();
  const battery = useLiveStore(state => state.battery);
  const connection = useConnectionStore(state => state.status);
  const busy =
    connection === 'scanning' ||
    connection === 'connecting' ||
    connection === 'reconnecting';

  const label = busy
    ? t(
        connection === 'reconnecting'
          ? 'statusReconnecting'
          : 'statusConnecting',
      )
    : t(
        status === 'live'
          ? 'statusLive'
          : status === 'demo'
          ? 'statusDemo'
          : status === 'stale'
          ? 'statusNoData'
          : 'statusOffline',
      );

  const color = busy ? Colors.primary : dotColor[status];
  const showBattery =
    battery !== null && (status === 'live' || status === 'demo');

  return (
    <View
      style={styles.pill}
      accessibilityRole="text"
      accessibilityLabel={label}>
      <PulseDot color={color} active={status === 'live' || busy} />
      <Text style={styles.label}>{label}</Text>
      {showBattery && (
        <View style={styles.battery}>
          <Icon
            name="battery"
            size={18}
            level={battery!}
            color={battery! <= 15 ? Colors.danger : Colors.textSecondary}
          />
          <Text style={styles.batteryText}>{battery}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.borderStrong,
  },
  batteryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },
});
