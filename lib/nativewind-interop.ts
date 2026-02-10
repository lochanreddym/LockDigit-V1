/**
 * Register third-party components with NativeWind so that
 * `className` is properly translated to `style` props.
 *
 * This file MUST be imported before any component that uses
 * className on these third-party components.
 */
import { cssInterop } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

cssInterop(LinearGradient, {
  className: "style",
});

cssInterop(BlurView, {
  className: "style",
});
