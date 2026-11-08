/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {afterAll, it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';
import {sessionEngine} from '../src/session/sessionEngine';

afterAll(() => sessionEngine.dispose());

it('renders correctly', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<App />);
  });
  act(() => {
    tree?.unmount();
  });
});
