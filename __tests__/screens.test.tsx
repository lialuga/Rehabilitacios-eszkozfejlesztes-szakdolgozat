import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {afterAll, beforeEach, expect, it} from '@jest/globals';
import {HomeScreen} from '../src/screens/HomeScreen';
import {HistoryScreen} from '../src/screens/HistoryScreen';
import {SettingsScreen} from '../src/screens/SettingsScreen';
import {sessionEngine} from '../src/session/sessionEngine';
import {useHistoryStore} from '../src/store/historyStore';
import {useLanguageStore} from '../src/store/languageStore';
import {useSettingsStore} from '../src/store/settingsStore';

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => node.props.children)
    .flat()
    .join(' ');

beforeEach(() => {
  useLanguageStore.setState({language: 'hu'});
  useHistoryStore.setState({sessions: []});
  sessionEngine.discard();
  sessionEngine.resetLive();
});

afterAll(() => sessionEngine.dispose());

it('shows the connect hero when there is no data source', () => {
  useSettingsStore.setState({demoMode: false});
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<HomeScreen onOpenHistory={() => {}} />);
  });
  expect(texts(tree)).toContain('Csatlakoztasd a szenzort');
  act(() => tree.unmount());
});

it('renders live data, a running session and a metric sheet', () => {
  useSettingsStore.setState({demoMode: true});
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<HomeScreen onOpenHistory={() => {}} />);
  });
  act(() => {
    let now = Date.now();
    for (let i = 0; i < 40; i++) {
      sessionEngine.ingest(
        {
          roll: i % 10 === 0 ? 11 : -2.5,
          pitch: 0,
          stability: 0,
          inwardPercent: 0,
          battery: 70,
          strikes: null,
        },
        'demo',
        (now += 50),
      );
    }
    sessionEngine.start(now);
    sessionEngine.ingest(
      {
        roll: 12,
        pitch: 0,
        stability: 0,
        inwardPercent: 0,
        battery: 70,
        strikes: null,
      },
      'demo',
      now + 50,
    );
    sessionEngine.publish();
  });
  const output = texts(tree);
  expect(output).toContain('Rögzítés');
  expect(output).toContain('Demó mód');

  const tile = tree.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      /Stabilitás/.test(node.props.accessibilityLabel ?? ''),
  )[0];
  act(() => tile.props.onPress());
  expect(texts(tree)).toContain('Mennyire stabil');

  act(() => {
    sessionEngine.stop();
  });
  act(() => tree.unmount());
});

it('renders history with sessions and the settings screen', () => {
  useHistoryStore.setState({
    sessions: [
      {
        id: 'a',
        startedAt: Date.now() - 3600_000,
        durationMs: 125_000,
        avgStability: 82,
        inwardPercent: 12,
        balance: 84,
        motorActivations: 7,
        avgCorrectionMs: 420,
        peakAngle: 11.2,
        avgAngle: 1.3,
        threshold: 8,
        source: 'ble',
        trace: [0, 1, 2, 9, 3, 1],
      },
      {
        id: 'b',
        startedAt: Date.now() - 86400_000 * 3,
        durationMs: 65_000,
        avgStability: 64,
        inwardPercent: 30,
        balance: 66,
        motorActivations: 15,
        avgCorrectionMs: 800,
        peakAngle: 14,
        avgAngle: 3,
        threshold: 8,
        source: 'demo',
        trace: [],
      },
    ],
  });
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<HistoryScreen />);
  });
  expect(texts(tree)).toContain('2 mérés');
  act(() => tree.unmount());

  act(() => {
    tree = renderer.create(<SettingsScreen />);
  });
  expect(texts(tree)).toContain('Befelé küszöb');
  act(() => tree.unmount());
});

it('shows outward alerts, steps and cadence during a session', () => {
  useSettingsStore.setState({
    demoMode: true,
    inwardThreshold: 8,
    outwardThreshold: 10,
  });
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<HomeScreen onOpenHistory={() => {}} />);
  });
  const frame = (roll: number, strikes: number) => ({
    roll,
    pitch: 0,
    stability: 0,
    inwardPercent: 0,
    battery: 70,
    strikes,
  });
  act(() => {
    let now = Date.now() - 20_000;
    let strikes = 0;
    sessionEngine.ingest(frame(0, strikes), 'demo', now);
    sessionEngine.start(now);
    for (let i = 1; i <= 12; i++) {
      sessionEngine.ingest(
        frame(i === 6 ? -12 : 1, ++strikes),
        'demo',
        (now += 1000),
      );
    }
    sessionEngine.publish();
  });
  const output = texts(tree);
  expect(output).toContain('Be 8° · Ki 10°');
  expect(output).toContain('Kifelé jelzések');
  expect(output).toContain('Elesésveszély');
  expect(output).toContain('Lépések');
  expect(output).toContain('24');
  expect(output).toContain('lépés/perc');

  const tile = tree.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      /Lépések/.test(node.props.accessibilityLabel ?? ''),
  )[0];
  act(() => tile.props.onPress());
  expect(texts(tree)).toContain('mindkét lábat');

  act(() => {
    sessionEngine.stop();
  });
  act(() => tree.unmount());
});
