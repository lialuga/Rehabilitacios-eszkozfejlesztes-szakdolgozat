declare module 'react-native-base64' {
  const base64: {
    encode(input: string): string;
    encodeFromByteArray(input: Uint8Array | number[]): string;
    decode(input: string): string;
  };
  export default base64;
}
