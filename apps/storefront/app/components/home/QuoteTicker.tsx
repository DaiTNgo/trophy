export function QuoteTicker() {
  const quotes = [
    "Trao đi giá trị, nhận lại nụ cười",
    "Mỗi giải thưởng là một câu chuyện xứng đáng được khắc ghi",
    "Phùng Thị biến ý tưởng khách hàng thành hiện thực",
  ];

  const items = quotes.flatMap((q, i) => {
    const elements: React.ReactNode[] = [<span key={`q-${i}`}>{q}</span>];
    elements.push(
      <span key={`s-${i}`} className="text-on-surface-variant/40">✦</span>,
    );
    return elements;
  });

  return (
    <div className="w-full overflow-hidden bg-surface py-3 mt-8">
      <div className="marquee-wrapper">
        <div className="marquee-track flex items-center gap-16 whitespace-nowrap text-[18px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
          {items}
          {items}
        </div>
      </div>
      <style>{`
        .marquee-wrapper {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          width: fit-content;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
