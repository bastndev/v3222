import './App.css'

import welcomeHero from '../assets/welcome-hero.png'

export function App() {
  return (
    <view className="page">
      <view className="glow glow--top" />
      <view className="glow glow--bottom" />

      <view className="welcome">
        <image className="welcome__hero" mode="aspectFit" src={welcomeHero} />

        <view className="content">
          <text className="eyebrow">LYNX · ANDROID</text>
          <text className="title">{{ displayName }}</text>
          <text className="description">
            Your project is ready. Edit src/App.tsx and save to see changes
            instantly.
          </text>

          <view className="status">
            <view className="status__dot" />
            <text className="status__text">Live development ready</text>
          </view>
        </view>
      </view>
    </view>
  )
}
