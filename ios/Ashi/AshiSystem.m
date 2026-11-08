#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface AshiSystem : NSObject <RCTBridgeModule>
@end

@implementation AshiSystem

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(setKeepAwake : (BOOL)enabled)
{
  [UIApplication sharedApplication].idleTimerDisabled = enabled;
}

RCT_EXPORT_METHOD(startSessionService : (NSString *)title body : (NSString *)body)
{
}

RCT_EXPORT_METHOD(stopSessionService)
{
}

@end
