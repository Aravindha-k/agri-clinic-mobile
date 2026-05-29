import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/** Realistic tree silhouette — anchored to bottom of viewBox (ground at y=480). */
export function TreeSvgArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 500" preserveAspectRatio="xMidYMax meet">
      <Defs>
        <LinearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C5D4BC" />
          <Stop offset="100%" stopColor="#A8B89E" />
        </LinearGradient>
        <LinearGradient id="trunkGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#6D4C41" />
          <Stop offset="55%" stopColor="#5D4037" />
          <Stop offset="100%" stopColor="#3E2723" />
        </LinearGradient>
        <LinearGradient id="branchGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#4E342E" />
          <Stop offset="100%" stopColor="#3E2723" />
        </LinearGradient>
        <LinearGradient id="leafDeep" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1B4332" />
          <Stop offset="100%" stopColor="#081C15" />
        </LinearGradient>
        <LinearGradient id="leafMid" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2D6A4F" />
          <Stop offset="100%" stopColor="#1B4332" />
        </LinearGradient>
        <LinearGradient id="leafLight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#52B788" />
          <Stop offset="100%" stopColor="#2D6A4F" />
        </LinearGradient>
      </Defs>

      {/* Ground */}
      <Rect x="0" y="468" width="400" height="32" fill="url(#soilGrad)" />
      <Ellipse cx="200" cy="472" rx="195" ry="14" fill="#B0C0A8" opacity={0.85} />

      {/* Back foliage (depth) */}
      <G opacity={0.92}>
        <Ellipse cx="200" cy="195" rx="118" ry="82" fill="url(#leafDeep)" />
        <Ellipse cx="108" cy="228" rx="72" ry="58" fill="url(#leafDeep)" />
        <Ellipse cx="298" cy="222" rx="68" ry="54" fill="url(#leafDeep)" />
      </G>

      {/* Trunk — tapered organic shape */}
      <Path
        d="M200 478
           C218 420 222 360 216 310
           C212 275 208 248 204 230
           C202 218 198 218 196 230
           C192 248 188 275 184 310
           C178 360 182 420 200 478 Z"
        fill="url(#trunkGrad)"
      />

      {/* Branches */}
      <Path
        d="M200 305 C165 295 125 268 88 218"
        stroke="url(#branchGrad)"
        strokeWidth={11}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M200 298 C238 288 278 258 318 205"
        stroke="url(#branchGrad)"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M204 248 C190 235 178 218 172 198"
        stroke="#4E342E"
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M196 245 C212 232 228 215 234 192"
        stroke="#4E342E"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Mid foliage */}
      <G>
        <Ellipse cx="200" cy="168" rx="102" ry="72" fill="url(#leafMid)" />
        <Ellipse cx="128" cy="210" rx="58" ry="48" fill="url(#leafMid)" />
        <Ellipse cx="278" cy="205" rx="54" ry="46" fill="url(#leafMid)" />
        <Ellipse cx="200" cy="118" rx="62" ry="48" fill="url(#leafMid)" />
      </G>

      {/* Front highlights */}
      <G opacity={0.88}>
        <Ellipse cx="178" cy="185" rx="42" ry="34" fill="url(#leafLight)" />
        <Ellipse cx="232" cy="178" rx="38" ry="30" fill="url(#leafLight)" />
        <Ellipse cx="200" cy="138" rx="48" ry="36" fill="url(#leafLight)" />
        <Ellipse cx="155" cy="225" rx="28" ry="22" fill="#74C69D" opacity={0.55} />
        <Ellipse cx="252" cy="218" rx="26" ry="20" fill="#74C69D" opacity={0.5} />
      </G>
    </Svg>
  );
}
