import './App.css'

export function App() {
  return (
    <view className="page">
      <view className="glow glow--top" />
      <view className="glow glow--bottom" />

      <view className="content">
        <text className="eyebrow">LYNX · ANDROID</text>
        <text className="title">{{ displayName }}</text>
        <text className="description">
          Edit src/App.tsx and save. Your Lynx preview will update while you
          work.
        </text>

        <view className="status">
          <view className="status__dot" />
          <text className="status__text">Ready to build</text>
        </view>
      </view>
    </view>
  )
}
