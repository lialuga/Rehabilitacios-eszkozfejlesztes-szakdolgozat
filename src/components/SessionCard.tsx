import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';
import {Typography} from '../design/typography';
import {useNow} from '../hooks/useNow';
import {useT} from '../hooks/useT';
import {sessionEngine} from '../session/sessionEngine';
import {SessionRecord} from '../store/historyStore';
import {getElapsedMs, useSessionStore} from '../store/sessionStore';
import {formatDuration} from '../utils/format';
import {Button} from './Button';
import {Card} from './Card';
import {PulseDot} from './PulseDot';

interface Props {
  canStart: boolean;
  onFinished: (record: SessionRecord | null) => void;
}

export const SessionCard = React.memo(({canStart, onFinished}: Props) => {
  const t = useT();
  const session = useSessionStore();
  const running = session.status === 'running';
  const now = useNow(500, running);
  const elapsed = getElapsedMs(session, now);

  if (session.status === 'idle') {
    return (
      <Card>
        <Text style={styles.overline}>{t('sessionTitle')}</Text>
        <Text style={styles.body}>
          {canStart ? t('sessionIdleBody') : t('sessionNeedsData')}
        </Text>
        <Button
          label={t('startSession')}
          variant="session"
          icon="play"
          disabled={!canStart}
          onPress={() => sessionEngine.start()}
          style={styles.startButton}
        />
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.overline}>{t('sessionTitle')}</Text>
        <View style={styles.state}>
          <PulseDot
            color={running ? Colors.danger : Colors.warning}
            active={running}
          />
          <Text
            style={[
              styles.stateText,
              {color: running ? Colors.danger : Colors.warning},
            ]}>
            {running ? t('recording') : t('paused')}
          </Text>
        </View>
      </View>

      <Text
        style={styles.timer}
        accessibilityLabel={`${t('elapsed')} ${formatDuration(elapsed)}`}>
        {formatDuration(elapsed)}
      </Text>

      <View style={styles.actions}>
        {running ? (
          <Button
            label={t('pause')}
            icon="pause"
            variant="secondary"
            onPress={() => sessionEngine.pause()}
            style={styles.action}
          />
        ) : (
          <Button
            label={t('resume')}
            icon="play"
            variant="session"
            disabled={!canStart}
            onPress={() => sessionEngine.resume()}
            style={styles.action}
          />
        )}
        <View style={styles.gap} />
        <Button
          label={t('finish')}
          icon="stop"
          variant="danger"
          onPress={() => onFinished(sessionEngine.stop())}
          style={styles.action}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  overline: {
    ...Typography.overline,
    color: Colors.textSecondary,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  startButton: {
    marginTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  timer: {
    ...Typography.display,
    fontSize: 52,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 14,
  },
  action: {
    flex: 1,
  },
  gap: {
    width: 10,
  },
});
