import React, { useState, useRef, useEffect } from 'react';
import { Pipette, Copy, Check, Shuffle, X } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

// Color Utility Functions (HEX, RGB, HSL, HSV)
function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToRgb(h: number, s: number, v: number) {
  s /= 100; v /= 100;
  const i = Math.floor((h / 60) % 6);
  const f = (h / 60) - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const PRESET_SWATCHES = [
  '#FF5252', '#FF7A00', '#4CAF50', '#00897B', '#FFEB3B', '#1E1E1E',
  '#2962FF', '#6200EA', '#FF6D00', '#D500F9', '#00E676', '#3D5AFE'
];

export default function ColorPickerPopover({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<'HEX' | 'RGB' | 'HSL' | 'HSB'>('HEX');
  const [copied, setCopied] = useState(false);
  
  const activeColorHex = color.startsWith('#') ? color : '#7B0099';
  const initialRgb = hexToRgb(activeColorHex);
  const initialHsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);
  
  const [hue, setHue] = useState(initialHsv.h);
  const [sat, setSat] = useState(initialHsv.s);
  const [val, setVal] = useState(initialHsv.v);
  const [hexInput, setHexInput] = useState(activeColorHex.replace('#', ''));

  const containerRef = useRef<HTMLDivElement>(null);
  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);

  useEffect(() => {
    if (color.startsWith('#')) {
      const rgb = hexToRgb(color);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSat(hsv.s);
      setVal(hsv.v);
      setHexInput(color.replace('#', ''));
    }
  }, [color]);

  const updateHsv = (h: number, s: number, v: number) => {
    setHue(h);
    setSat(s);
    setVal(v);
    const rgb = hsvToRgb(h, s, v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex.replace('#', ''));
    onChange(hex);
  };

  const handleSatValMove = (e: MouseEvent | TouchEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);
    
    updateHsv(hue, s, v);
  };

  const handleSatValMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingSatVal.current = true;
    handleSatValMove(e.nativeEvent);
    
    const handleMouseUp = () => {
      isDraggingSatVal.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
    
    const handleMouseMove = (ev: MouseEvent | TouchEvent) => {
      if (isDraggingSatVal.current) {
        handleSatValMove(ev);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
  };

  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          onChange(result.sRGBHex.toUpperCase());
        }
      } catch (e) {}
    }
  };

  const handleRandomColor = () => {
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    onChange(randomHex);
  };

  const handleCopy = () => {
    const activeHex = color.startsWith('#') ? color : `#${color}`;
    navigator.clipboard.writeText(activeHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentColorHex = color.startsWith('#') ? color : `#${color}`;
  const currentRgb = hsvToRgb(hue, sat, val);
  const currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
  const pureHueRgb = hsvToRgb(hue, 100, 100);
  const pureHueHex = rgbToHex(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button - Apple iCloud Rainbow Wheel */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110 p-[2.5px] shadow-sm ${color.startsWith('#') ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-300 scale-105' : 'opacity-90 hover:opacity-100'}`}
        style={{
          background: 'conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)'
        }}
        title="Custom Color Picker"
      >
        <div 
          className="w-full h-full rounded-full transition-colors"
          style={{ backgroundColor: color.startsWith('#') ? color : '#121212' }}
        />
      </button>

      {/* Color Picker Card Popover */}
      {isOpen && (
        <div className="absolute top-8 left-0 z-50 w-[270px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-3">
          
          {/* Header Bar with Random & Close */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Color Palette</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRandomColor}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Random Color Generator"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2D Saturation / Value Gradient Canvas Area */}
          <div
            ref={satValRef}
            onMouseDown={handleSatValMouseDown}
            onTouchStart={handleSatValMouseDown}
            className="relative w-full h-[140px] rounded-2xl cursor-crosshair overflow-hidden shadow-inner select-none"
            style={{ backgroundColor: pureHueHex }}
          >
            {/* White-to-transparent horizontal overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
            {/* Black-to-transparent vertical overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            
            {/* Selection Cursor Ring */}
            <div
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${sat}%`,
                top: `${100 - val}%`,
                backgroundColor: currentColorHex
              }}
            />
          </div>

          {/* Hue Rainbow Slider */}
          <div className="relative flex items-center px-1">
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => updateHsv(Number(e.target.value), sat, val)}
              className="w-full h-3 rounded-full appearance-none cursor-pointer outline-none shadow-inner"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
            />
          </div>

          {/* Format Selector Tabs (HEX, RGB, HSL, HSB) */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[10px] font-extrabold text-slate-500">
            {(['HEX', 'RGB', 'HSL', 'HSB'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`py-1 rounded-lg transition-all ${format === fmt ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'hover:text-slate-900 dark:hover:text-white'}`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Value Display / Eyedropper Field */}
          <div className="flex items-center gap-2">
            {'EyeDropper' in window && (
              <button
                type="button"
                onClick={handleEyedropper}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                title="Eyedropper Color Picker"
              >
                <Pipette className="w-4 h-4" />
              </button>
            )}

            <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 justify-between font-mono text-xs text-slate-800 dark:text-slate-200 font-bold border border-transparent focus-within:border-slate-300">
              {format === 'HEX' && (
                <div className="flex items-center gap-1 w-full">
                  <span className="text-slate-400">#</span>
                  <input
                    type="text"
                    maxLength={6}
                    value={hexInput}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setHexInput(val);
                      if (/^[0-9A-F]{6}$/i.test(val)) {
                        onChange(`#${val}`);
                      }
                    }}
                    className="bg-transparent border-none outline-none w-full font-mono text-xs uppercase text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 font-sans font-semibold">100%</span>
                </div>
              )}
              {format === 'RGB' && (
                <span className="text-[11px]">{`${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b}`}</span>
              )}
              {format === 'HSL' && (
                <span className="text-[11px]">{`${currentHsl.h}°, ${currentHsl.s}%, ${currentHsl.l}%`}</span>
              )}
              {format === 'HSB' && (
                <span className="text-[11px]">{`${hue}°, ${sat}%, ${val}%`}</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              title="Copy Hex Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Swatch Palette Grid */}
          <div className="grid grid-cols-6 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            {PRESET_SWATCHES.map(swatchHex => (
              <button
                key={swatchHex}
                type="button"
                onClick={() => onChange(swatchHex)}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 shadow-xs border border-black/10 ${currentColorHex.toUpperCase() === swatchHex.toUpperCase() ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110' : ''}`}
                style={{ backgroundColor: swatchHex }}
              />
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
