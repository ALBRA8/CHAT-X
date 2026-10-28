"""Figura 1: Credito mensual por tier en fanv.ai (datos de investigacion propia).
Reglas charts.md: barras horizontales (labels > 10 chars), sin spines top/right,
sin grilla (valores etiquetados), sin titulo interno (el caption del PDF sirve
de identificador), colores de una misma familia de azul (Template 07).
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

tiers = ['Starter\n$29/mes', 'Creator\n$59/mes', 'Agency\n$119/mes']
credits = [850, 1800, 3900]
# Escalera de luminosidad de la misma familia de azul (~210 grados)
colors = ['#9cc4de', '#4a90c4', '#1a4a7a']

fig, ax = plt.subplots(figsize=(7.4, 2.9), dpi=200, constrained_layout=True)

bars = ax.barh(tiers, credits, color=colors, edgecolor='none', height=0.62)

# Etiquetas de valor al final de cada barra
for bar, val in zip(bars, credits):
    ax.text(val + 60, bar.get_y() + bar.get_height() / 2,
            f'{val:,} creditos'.replace(',', '.'),
            va='center', ha='left', fontsize=11, color='#142840')

# Limpieza de ejes: spines top/right/left fuera, bottom fino gris
for side in ['top', 'right', 'left']:
    ax.spines[side].set_visible(False)
ax.spines['bottom'].set_color('#c0d0e2')
ax.spines['bottom'].set_linewidth(0.8)

ax.set_xlim(0, 4600)
ax.set_xticks([])                      # valores ya etiquetados -> sin grilla ni ticks
ax.tick_params(axis='y', length=0, labelsize=11, colors='#142840')
ax.invert_yaxis()                      # Starter arriba, Agency abajo

fig.savefig('/home/z/my-project/work-assets/fig1_fanv_credits.png', facecolor='white')
print('fig1 ok')
