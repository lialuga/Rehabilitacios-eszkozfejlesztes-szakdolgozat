import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {afterAll, expect, it, jest} from '@jest/globals';
import {SessionCard} from '../src/components/SessionCard';
import {sessionEngine} from '../src/session/sessionEngine';

afterAll(() => sessionEngine.dispose());

const timerText = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => n.props.children)
    .find(c => typeof c === 'string' && /^\d+:\d\d$/.test(c));

it('advances the session timer while recording', () => {
  jest.useFakeTimers();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<SessionCard canStart onFinished={() => {}} />);
  });
  act(() => {
    sessionEngine.start();
  });
  act(() => {
    jest.advanceTimersByTime(5200);
  });
  expect(timerText(tree)).toBe('0:05');
  act(() => {
    sessionEngine.discard();
    tree.unmount();
  });
  jest.useRealTimers();
});
