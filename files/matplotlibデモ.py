import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64
import math

fig, ax = plt.subplots(figsize=(4, 3))

x_list = [i for i in range(300)]
y_list = []

for x in x_list:
    y_list.append(math.sin(x / 10.0))
ax.plot(x_list, y_list, marker='')

ax.set_title("Simple Line Graph")
buf = io.BytesIO()
fig.savefig(buf, format='png')
buf.seek(0)
img_base64 = base64.b64encode(buf.read()).decode('ascii')
plt.close(fig)
img_base64
