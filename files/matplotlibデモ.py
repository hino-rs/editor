import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64

fig, ax = plt.subplots(figsize=(4, 3))
ax.plot([1, 2, 3, 4], [10, 20, 15, 25], marker='o')
ax.set_title("Simple Line Graph")
buf = io.BytesIO()
fig.savefig(buf, format='png')
buf.seek(0)
img_base64 = base64.b64encode(buf.read()).decode('ascii')
plt.close(fig)
img_base64
