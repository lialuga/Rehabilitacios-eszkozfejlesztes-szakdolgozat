import React, {useCallback, useEffect, useState} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {
  BackHandler,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {GlassView} from './src/components/GlassView';
import {Icon, IconName} from './src/components/Icon';
import {HomeScreen} from './src/screens/HomeScreen';
import {HistoryScreen} from './src/screens/HistoryScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {startMockStream, stopMockStream} from './src/ble/mockStream';
import {initSessionLifecycle} from './src/system/sessionLifecycle';
import {sessionEngine} from './src/session/sessionEngine';
import {Colors} from './src/design/colors';
import {useT} from './src/hooks/useT';
import {TranslationKey} from './src/i18n/translations';
import {useConnectionStore} from './src/store/connectionStore';
import {useSessionStore} from './src/store/sessionStore';
import {useSettingsStore} from './src/store/settingsStore';

type MainTab = 'home' | 'history' | 'settings';

const TABS: {key: MainTab; label: TranslationKey; icon: IconName}[] = [
  {key: 'home', label: 'homeTab', icon: 'activity'},
  {key: 'history', label: 'historyTab', icon: 'clock'},
  {key: 'settings', label: 'settingsTab', icon: 'sliders'},
];

const useDataSource = () => {
  const demoMode = useSettingsStore(state => state.demoMode);
  const connection = useConnectionStore(state => state.status);
  const shouldDemo =
    demoMode &&
    (connection === 'idle' ||
      connection === 'scanning' ||
      connection === 'connecting');

  useEffect(() => {
    if (shouldDemo) {
      startMockStream();
      return () => {
        stopMockStream();
        if (useSessionStore.getState().status === 'running') {
          sessionEngine.pause();
        }
        if (useConnectionStore.getState().status !== 'connected') {
          sessionEngine.resetLive();
        }
      };
    }
  }, [shouldDemo]);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const t = useT();
  const openHistory = useCallback(() => setActiveTab('history'), []);

  useDataSource();

  useEffect(() => initSessionLifecycle(), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [activeTab]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            {activeTab === 'home' && <HomeScreen onOpenHistory={openHistory} />}
            {activeTab === 'history' && <HistoryScreen />}
            {activeTab === 'settings' && <SettingsScreen />}
          </View>

          <View style={styles.tabBarWrap} pointerEvents="box-none">
            <View style={styles.tabBar}>
              <GlassView
                style={StyleSheet.absoluteFill}
                glassStyle="regular"
                cornerRadius={28}
                tintColorHex="141A26E6"
              />
              {TABS.map(tab => {
                const active = activeTab === tab.key;
                const color = active
                  ? Colors.textPrimary
                  : Colors.textSecondary;
                return (
                  <Pressable
                    key={tab.key}
                    style={styles.tabButton}
                    hitSlop={6}
                    accessibilityRole="tab"
                    accessibilityState={{selected: active}}
                    accessibilityLabel={t(tab.label)}
                    onPress={() => setActiveTab(tab.key)}>
                    <View
                      style={[
                        styles.tabBubble,
                        active && styles.tabBubbleActive,
                      ]}>
                      {active && Platform.OS === 'ios' && (
                        <GlassView
                          style={StyleSheet.absoluteFill}
                          glassStyle="clear"
                          cornerRadius={20}
                          tintColorHex="5B8CFF55"
                        />
                      )}
                      <Icon
                        name={tab.icon}
                        size={20}
                        color={color}
                        strokeWidth={active ? 2.2 : 1.9}
                      />
                      <Text style={[styles.tabText, {color}]} numberOfLines={1}>
                        {t(tab.label)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tabBar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    padding: 6,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(20,26,38,0.55)',
    elevation: 16,
  },
  tabButton: {
    flex: 1,
  },
  tabBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 22,
    overflow: 'hidden',
  },
  tabBubbleActive: {
    backgroundColor: 'rgba(91,140,255,0.16)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
