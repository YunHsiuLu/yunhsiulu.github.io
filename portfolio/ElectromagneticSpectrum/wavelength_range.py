import numpy as np
import matplotlib.pyplot as plt

# 建立畫布
fig, ax1 = plt.subplots(figsize=(16, 8))

# 1. 建立波形 (保持優美的線性拉伸感)
x = np.linspace(0, 10, 1000)
y = np.sin(2 * np.pi * (15 / (x + 2)) * x)
ax1.plot(x, y, color='darkblue', linewidth=2.5, alpha=0.9)

# 2. 設定底部的波長軸 (Wavelength)
wavelength_ticks = np.linspace(0, 10, 6)
wavelength_labels = [r'$10^{-12}$', r'$10^{-9}$', r'$10^{-6}$', r'$10^{-3}$', r'$10^{0}$', r'$10^{3}$']
ax1.set_xticks(wavelength_ticks)
ax1.set_xticklabels(wavelength_labels, fontsize=11)
ax1.set_xlabel(r'Wavelength $\lambda$ (m)', fontsize=13, labelpad=10)

# 3. 建立頂部的頻率軸 (Frequency) - 僅顯示數量級
ax2 = ax1.twiny()
ax2.set_xlim(ax1.get_xlim())
ax2.set_xticks(wavelength_ticks)
# 對應關係：10^-12m -> 10^20Hz, 10^3m -> 10^5Hz
frequency_labels = [r'$10^{20}$', r'$10^{17}$', r'$10^{14}$', r'$10^{11}$', r'$10^{8}$', r'$10^{5}$']
ax2.set_xticklabels(frequency_labels, fontsize=11)
ax2.set_xlabel('Frequency $f$ (Hz)', fontsize=13, labelpad=10)

# 4. 映射函數：將物理 log10(lambda) 映射到圖中 x 座標 (0~10)
def map_wl(log_val):
    return (log_val - (-12)) * (10 / (3 - (-12)))

# 5. 標註各個主要波段
sections = [
    (-11.5, 'Gamma Ray'),
    (-10.0, 'X-Ray'),
    (-8.0, 'UV'),
    (-5.0, 'Infrared'),
    (-2.5, 'Microwave'),
    (1.5, 'Radio / Wireless')
]

for wl_log, name in sections:
    ax1.text(map_wl(wl_log), 1.3, name, ha='center', fontsize=11, fontweight='bold', color='#333333')

# 6. 標示具體應用應用 (Wi-Fi, Bluetooth, 5G 等)
# Wi-Fi/BT 2.4GHz -> ~10^-1 m
apps = [
    (-1.0, 'Wi-Fi / BT'),
    (0.2, '4G / 5G'),
    (2.5, 'AM Radio')
]

for wl_log, name in apps:
    ax1.annotate(name, xy=(map_wl(wl_log), -1.05), xytext=(map_wl(wl_log), -1.8),
                 arrowprops=dict(arrowstyle='->', color='gray', lw=1), 
                 ha='center', fontsize=10, color='#555555')

# 7. 可見光細節區塊
v_start, v_end = map_wl(-6.42), map_wl(-6.1) # 380nm ~ 780nm
ax1.axvspan(v_start, v_end, color='orange', alpha=0.15, label='Visible Light')

# 380, 555, 780nm 箭頭標註
ax1.annotate('380nm', xy=(v_start, 1), xytext=(v_start-0.4, 2.2),
             arrowprops=dict(edgecolor='purple', arrowstyle='->', lw=2), color='purple', fontweight='bold')
ax1.annotate('555nm', xy=((v_start+v_end)/2, 1), xytext=((v_start+v_end)/2, 2.8),
             arrowprops=dict(edgecolor='green', arrowstyle='->', lw=2), color='green', fontweight='bold', ha='center')
ax1.annotate('780nm', xy=(v_end, 1), xytext=(v_end+0.4, 2.2),
             arrowprops=dict(edgecolor='red', arrowstyle='->', lw=2), color='red', fontweight='bold')

# 8. 最終美化
ax1.set_yticks([]) # 隱藏振幅數值
ax1.set_ylim(-2.5, 3.8)
ax1.set_title('Electromagnetic Spectrum & Applications', fontsize=16, pad=40)
ax1.grid(True, axis='x', alpha=0.2, linestyle='--')

plt.tight_layout()
plt.show()
