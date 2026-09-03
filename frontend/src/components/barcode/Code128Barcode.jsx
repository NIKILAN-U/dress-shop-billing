import React from 'react';

// CODE128 (Subset B) Encoding Table
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', // 50-59
  '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', // 60-69
  '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', // 70-79
  '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', // 80-89
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', // 90-99
  '2331112' // 100: Stop Code
];

const START_B = 104;
const STOP = 106;

export const Code128Barcode = ({
  value = 'DSS000001',
  width = 2,
  height = 40,
  showText = true,
  className = ''
}) => {
  const text = (value || 'DSS000001').trim();

  // Convert ASCII characters to Code128 values
  const codes = [START_B];
  let checksum = START_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const codeVal = charCode - 32; // Code128 Code B mapping
    codes.push(codeVal);
    checksum += codeVal * (i + 1);
  }

  const checkCode = checksum % 103;
  codes.push(checkCode);
  codes.push(STOP);

  // Convert pattern strings into bar widths
  let bars = [];
  codes.forEach((codeIdx) => {
    const pattern = CODE128_PATTERNS[codeIdx] || CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const widthVal = parseInt(pattern[i], 10);
      const isBar = i % 2 === 0;
      bars.push({ width: widthVal, isBar });
    }
  });

  const totalWidthUnits = bars.reduce((sum, b) => sum + b.width, 0);
  const totalPixelWidth = totalWidthUnits * width;

  let currentX = 0;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={totalPixelWidth}
        height={height}
        viewBox={`0 0 ${totalPixelWidth} ${height}`}
        className="overflow-visible"
      >
        {bars.map((b, idx) => {
          const barW = b.width * width;
          const x = currentX;
          currentX += barW;
          if (!b.isBar) return null;
          return <rect key={idx} x={x} y={0} width={barW} height={height} fill="#000000" />;
        })}
      </svg>

      {showText && (
        <div className="font-mono text-center font-bold tracking-widest text-[11px] text-slate-900 mt-0.5">
          {text}
        </div>
      )}
    </div>
  );
};
