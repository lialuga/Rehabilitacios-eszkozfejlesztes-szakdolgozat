import React from 'react';
import {ActivityIndicator, Linking, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {bleService} from '../ble/bleService';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';
import {Typography} from '../design/typography';
import {DataStatus} from '../hooks/useDataStatus';
import {useT} from '../hooks/useT';
import {ConnectionIssue, useConnectionStore} from '../store/connectionStore';
import {useSettingsStore} from '../store/settingsStore';
import {TranslationKey} from '../i18n/translations';
import {Button} from './Button';
import {Card} from './Card';
import {Icon} from './Icon';

export const issueText: Record<ConnectionIssue, TranslationKey> = {
  bluetoothOff: 'issueBluetoothOff',
  bluetoothUnsupported: 'issueUnsupported',
  permissionDenied: 'issuePermissionDenied',
  permissionBlocked: 'issuePermissionBlocked',
  notFound: 'issueNotFound',
  connectFailed: 'issueConnectFailed',
  incompatibleDevice: 'issueIncompatible',
  connectionLost: 'issueConnectionLost',
};

const IssueBanner = ({issue}: {issue: ConnectionIssue}) => {
  const t = useT();
  const needsSettings = issue === 'permissionBlocked';
  return (
    <View style={styles.issue}>
      <Icon name="alert" size={18} color={Colors.danger} />
      <View style={styles.issueBody}>
        <Text style={styles.issueText}>{t(issueText[issue])}</Text>
        {needsSettings && (
          <Text style={styles.issueLink} onPress={() => Linking.openSettings()}>
            {t('openSettings')}
          </Text>
        )}
      </View>
    </View>
  );
};

export const ConnectHero = () => {
  const t = useT();
  const status = useConnectionStore(state => state.status);
  const issue = useConnectionStore(state => state.issue);
  const setDemoMode = useSettingsStore(state => state.setDemoMode);
  const busy =
    status === 'scanning' ||
    status === 'connecting' ||
    status === 'reconnecting';

  return (
    <Card style={styles.hero}>
      <LinearGradient
        colors={['rgba(91,140,255,0.18)', 'rgba(91,140,255,0)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.heroIcon}>
        {busy ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Icon
            name="bluetooth"
            size={30}
            color={Colors.primary}
            strokeWidth={2}
          />
        )}
      </View>
      <Text style={styles.heroTitle}>
        {busy
          ? t(status === 'scanning' ? 'scanningTitle' : 'connectingTitle')
          : t('connectTitle')}
      </Text>
      <Text style={styles.heroBody}>
        {busy ? t('scanningBody') : t('connectBody')}
      </Text>

      {!!issue && !busy && <IssueBanner issue={issue} />}

      <View style={styles.heroActions}>
        {busy ? (
          <Button
            label={t('cancel')}
            variant="secondary"
            onPress={() => bleService.disconnect()}
          />
        ) : (
          <Button
            label={issue ? t('tryAgain') : t('connectDevice')}
            icon={issue ? 'refresh' : 'bluetooth'}
            onPress={() => bleService.connect()}
          />
        )}
        {!busy && (
          <Button
            label={t('tryDemo')}
            variant="ghost"
            icon="sparkles"
            onPress={() => setDemoMode(true)}
            style={styles.demoButton}
          />
        )}
      </View>
    </Card>
  );
};

export const ConnectionStrip = React.memo(
  ({dataStatus}: {dataStatus: DataStatus}) => {
    const t = useT();
    const status = useConnectionStore(state => state.status);
    const issue = useConnectionStore(state => state.issue);
    const deviceName = useConnectionStore(state => state.deviceName);
    const busy =
      status === 'scanning' ||
      status === 'connecting' ||
      status === 'reconnecting';

    let icon: 'bluetooth' | 'sparkles' | 'alert' = 'bluetooth';
    let tint = Colors.accent;
    let title = deviceName ?? t('sensor');
    let subtitle = t('connectedSubtitle');

    if (busy) {
      tint = Colors.primary;
      title = t(
        status === 'reconnecting'
          ? 'reconnectingTitle'
          : status === 'scanning'
          ? 'scanningTitle'
          : 'connectingTitle',
      );
      subtitle = t('scanningBody');
    } else if (dataStatus === 'stale') {
      icon = 'alert';
      tint = Colors.warning;
      subtitle = t('waitingForData');
    } else if (dataStatus === 'demo') {
      icon = 'sparkles';
      tint = Colors.violet;
      title = t('demoTitle');
      subtitle = t('demoSubtitle');
    }

    return (
      <Card style={styles.strip} padded={false}>
        <View style={styles.stripRow}>
          <View style={[styles.stripIcon, {backgroundColor: `${tint}24`}]}>
            {busy ? (
              <ActivityIndicator size="small" color={tint} />
            ) : (
              <Icon name={icon} size={18} color={tint} />
            )}
          </View>
          <View style={styles.stripTexts}>
            <Text style={styles.stripTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.stripSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          {status === 'connected' || busy ? (
            <Button
              compact
              variant="secondary"
              label={busy ? t('cancel') : t('disconnect')}
              onPress={() => bleService.disconnect()}
            />
          ) : (
            <Button
              compact
              variant="secondary"
              icon="bluetooth"
              label={t('connectShort')}
              onPress={() => bleService.connect()}
            />
          )}
        </View>
        {!!issue && !busy && status !== 'connected' && (
          <View style={styles.stripIssue}>
            <IssueBanner issue={issue} />
          </View>
        )}
      </Card>
    );
  },
);

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(91,140,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    ...Typography.h2,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  heroBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  heroActions: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
  demoButton: {
    marginTop: 6,
  },
  issue: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 16,
  },
  issueBody: {
    flex: 1,
    marginLeft: 10,
  },
  issueText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
  },
  issueLink: {
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  strip: {
    marginBottom: 16,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  stripIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripTexts: {
    flex: 1,
    marginHorizontal: 12,
  },
  stripTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  stripSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  stripIssue: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginTop: -12,
  },
});
