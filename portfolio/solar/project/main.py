import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Slider

# --- 真實物理常數 ---
G = 6.67430e-11        
AU = 1.495978707e11    
M_SUN = 1.989e30       
M_MOON = 7.342e22      
D_MOON = 384400000     

class Star:
    def __init__(self, name, mass, x=0.0, y=0.0, z=0.0):
        self.name = name
        self.mass = mass
        self.x = x
        self.y = y
        self.z = z

class Planet:
    def __init__(self, name, mass, semi_major_axis, eccentricity, inclination_deg, star, color='blue'):
        self.name = name
        self.mass = mass
        self.color = color
        
        r_p = semi_major_axis * (1 - eccentricity)
        
        self.x = star.x + r_p
        self.y = star.y
        self.z = star.z
        
        v_perihelion = np.sqrt((G * star.mass / semi_major_axis) * ((1 + eccentricity) / (1 - eccentricity)))
        incl_rad = np.radians(inclination_deg)
        
        self.vx = 0.0
        self.vy = v_perihelion * np.cos(incl_rad)
        self.vz = v_perihelion * np.sin(incl_rad)
        
        theta = np.linspace(0, 2 * np.pi, 200)
        r_theta = semi_major_axis * (1 - eccentricity**2) / (1 + eccentricity * np.cos(theta))
        
        self.orbit_x = star.x + r_theta * np.cos(theta)
        self.orbit_y = star.y + r_theta * np.sin(theta) * np.cos(incl_rad)
        self.orbit_z = star.z + r_theta * np.sin(theta) * np.sin(incl_rad)

    def update(self, dt, star):
        dx = self.x - star.x
        dy = self.y - star.y
        dz = self.z - star.z
        
        r = np.sqrt(dx**2 + dy**2 + dz**2)
        
        ax = -G * star.mass * dx / r**3
        ay = -G * star.mass * dy / r**3
        az = -G * star.mass * dz / r**3
        
        self.vx += ax * dt
        self.vy += ay * dt
        self.vz += az * dt
        
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.z += self.vz * dt

class Satellite:
    def __init__(self, name, mass, semi_major_axis, eccentricity, inclination_deg, parent_planet, color='white'):
        self.name = name
        self.mass = mass
        self.parent = parent_planet
        self.color = color
        
        r_p = semi_major_axis * (1 - eccentricity)
        
        self.rel_x = r_p
        self.rel_y = 0.0
        self.rel_z = 0.0
        
        v_perihelion = np.sqrt((G * self.parent.mass / semi_major_axis) * ((1 + eccentricity) / (1 - eccentricity)))
        incl_rad = np.radians(inclination_deg)
        
        self.rel_vx = 0.0
        self.rel_vy = v_perihelion * np.cos(incl_rad)
        self.rel_vz = v_perihelion * np.sin(incl_rad)
        
        self.x = self.parent.x + self.rel_x
        self.y = self.parent.y + self.rel_y
        self.z = self.parent.z + self.rel_z

        theta = np.linspace(0, 2 * np.pi, 100)
        r_theta = semi_major_axis * (1 - eccentricity**2) / (1 + eccentricity * np.cos(theta))
        
        self.rel_orbit_x = r_theta * np.cos(theta)
        self.rel_orbit_y = r_theta * np.sin(theta) * np.cos(incl_rad)
        self.rel_orbit_z = r_theta * np.sin(theta) * np.sin(incl_rad)

    def update(self, dt):
        r = np.sqrt(self.rel_x**2 + self.rel_y**2 + self.rel_z**2)
        
        ax = -G * self.parent.mass * self.rel_x / r**3
        ay = -G * self.parent.mass * self.rel_y / r**3
        az = -G * self.parent.mass * self.rel_z / r**3
        
        self.rel_vx += ax * dt
        self.rel_vy += ay * dt
        self.rel_vz += az * dt
        
        self.rel_x += self.rel_vx * dt
        self.rel_y += self.rel_vy * dt
        self.rel_z += self.rel_vz * dt
        
        self.x = self.parent.x + self.rel_x
        self.y = self.parent.y + self.rel_y
        self.z = self.parent.z + self.rel_z

# --- 初始化系統 ---
sun = Star(name="Sun", mass=M_SUN)

planets = [
    Planet("Mercury", 3.3011e23, 0.387 * AU, 0.2056, 7.00, sun, color='darkgray'),
    Planet("Venus", 4.8675e24, 0.723 * AU, 0.0067, 3.39, sun, color='goldenrod'),
    Planet("Earth", 5.972e24, 1.000 * AU, 0.0167, 0.00, sun, color='dodgerblue'),
    Planet("Mars", 6.4171e23, 1.524 * AU, 0.0934, 1.85, sun, color='tomato'),
    Planet("Jupiter", 1.898e27, 5.204 * AU, 0.0489, 1.30, sun, color='orange'),
    Planet("Saturn", 5.683e26, 9.582 * AU, 0.0565, 2.49, sun, color='khaki'),
    Planet("Uranus", 8.681e25, 19.201 * AU, 0.0457, 0.77, sun, color='lightblue'),
    Planet("Neptune", 1.024e26, 30.047 * AU, 0.0113, 1.77, sun, color='blue'),
    # 新增：哈雷彗星 (極端扁平的橢圓、逆行)
    Planet("Halley's Comet", 2.2e14, 17.8 * AU, 0.967, 162.2, sun, color='cyan') 
]

earth_obj = next(p for p in planets if p.name == "Earth")
moon = Satellite("Moon", M_MOON, D_MOON * 20, 0.0549, 5.14, earth_obj, color='white')

# --- 畫布與 UI 設定 ---
fixed_dt = 3600.0  
total_days = 0.0

fig = plt.figure(figsize=(12, 10), facecolor='black')
ax = fig.add_subplot(111, projection='3d')
ax.set_facecolor('black')
ax.set_title('Solar System 3D Simulation (with Halley\'s Comet)', color='white', pad=20)
plt.subplots_adjust(bottom=0.15, right=0.85)

ax.xaxis.set_pane_color((0.0, 0.0, 0.0, 1.0))
ax.yaxis.set_pane_color((0.0, 0.0, 0.0, 1.0))
ax.zaxis.set_pane_color((0.0, 0.0, 0.0, 1.0))
ax.grid(False)

# 為了看見哈雷彗星那超級長的軌道，將視野拉大到 15 AU
limit = 15.0 * AU
ax.set_xlim(-limit, limit); ax.set_ylim(-limit, limit); ax.set_zlim(-limit, limit)
ax.set_xticks([]); ax.set_yticks([]); ax.set_zticks([])

ax_speed = plt.axes([0.2, 0.05, 0.5, 0.03], facecolor='#333333')
# 因為哈雷彗星繞一圈要 75 年，我們把滑桿上限調高，讓你可隨時開「瘋狂加速」
s_speed = Slider(ax_speed, 'Speed', 1, 1000, valinit=100, valstep=1, color='lightgreen')

ax.plot([sun.x], [sun.y], [sun.z], 'o', color='gold', markersize=10, label="Sun")

planet_dots = []

for p in planets:
    # 畫出靜態軌道
    ax.plot(p.orbit_x, p.orbit_y, p.orbit_z, '-', color=p.color, alpha=0.3, linewidth=1.0)
    dot, = ax.plot([], [], [], 'o', color=p.color, markersize=5 if "Comet" not in p.name else 3)
    planet_dots.append(dot)

moon_dot, = ax.plot([], [], [], 'o', color=moon.color, markersize=3)
moon_orbit_line, = ax.plot([], [], [], '-', color=moon.color, alpha=0.4, linewidth=1.0)

import matplotlib.lines as mlines
legend_elements = [mlines.Line2D([0], [0], marker='o', color='w', label='Sun', markerfacecolor='gold', markersize=8)]
for b in planets + [moon]:
    legend_elements.append(mlines.Line2D([0], [0], marker='o', color='w', label=b.name, markerfacecolor=b.color, markersize=6 if "Comet" not in b.name else 4))

legend = ax.legend(handles=legend_elements, loc="center left", bbox_to_anchor=(1.05, 0.5), facecolor='black', framealpha=0.5, edgecolor='gray')
for text in legend.get_texts(): text.set_color("white")

time_text = ax.text2D(0.05, 0.95, '', transform=ax.transAxes, color='lightgreen', fontsize=14, fontweight='bold')

def animate(frame):
    global total_days
    steps_per_frame = int(s_speed.val)
    
    for _ in range(steps_per_frame):
        for p in planets:
            p.update(fixed_dt, sun)
        moon.update(fixed_dt)
        total_days += (fixed_dt / 86400.0)

    years = int(total_days // 365.25)
    days = int(total_days % 365.25)
    time_text.set_text(f'Time: {years} Years, {days:03d} Days')

    for i, p in enumerate(planets):
        planet_dots[i].set_data([p.x], [p.y])
        planet_dots[i].set_3d_properties([p.z])
        
    moon_dot.set_data([moon.x], [moon.y])
    moon_dot.set_3d_properties([moon.z])
    
    moon_orbit_line.set_data(moon.rel_orbit_x + earth_obj.x, moon.rel_orbit_y + earth_obj.y)
    moon_orbit_line.set_3d_properties(moon.rel_orbit_z + earth_obj.z)
        
    return planet_dots + [moon_dot, moon_orbit_line, time_text]

ani = FuncAnimation(fig, animate, frames=None, interval=20, blit=False, cache_frame_data=False)

plt.show()
