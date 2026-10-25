// src/components/editor/inspector/InspectorRow.jsx
export default function InspectorRow({ label, children }) {
  const labels = { Caption: '캡션', Size: '크기', Align: '정렬', Height: '높이', Speed: '움직임 속도', 'Caption Align': '캡션 정렬', 'Caption Size': '캡션 크기', 'Motion Preset': '움직임', 'Image Position': '이미지 위치', 'Visual Size': '이미지 크기', 'Story Length': '이야기 길이', Columns: '열 수', Gap: '간격', Rounded: '모서리', Ratio: '비율', Fit: '이미지 맞춤', 'Layout Mode': '배치 방식' };
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
        {labels[label] || label}
      </div>
      {children}
    </div>
  );
}
