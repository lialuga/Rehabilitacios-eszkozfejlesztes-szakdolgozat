// Source: React Native "iOS Native UI Components" guide (MIT), https://reactnative.dev/docs/legacy/native-components-ios
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(LiquidGlassView, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(glassStyle, NSString)
RCT_EXPORT_VIEW_PROPERTY(cornerRadius, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(isInteractive, BOOL)
RCT_EXPORT_VIEW_PROPERTY(tintColorHex, NSString)
@end
