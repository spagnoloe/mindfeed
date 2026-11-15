// Reanimated's runtime can't run in Jest without react-native-web, which the app doesn't use.
// The app only animates through CSS transitions on animated components, so in tests an
// animated component is the plain component: it renders the transition's target style.
// Extend this if a screen starts using other Reanimated APIs.
module.exports = {
  __esModule: true,
  default: { createAnimatedComponent: (component) => component },
};
