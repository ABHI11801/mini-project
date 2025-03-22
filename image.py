from diffusers import DiffusionPipeline
import torch


pipe = DiffusionPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float32
)

device = "cuda" if torch.cuda.is_available() else "cpu"
pipe = pipe.to(device)

if device == "cpu" or (torch.cuda.is_available() and torch.cuda.get_device_properties(0).total_memory < 8e9):
    pipe.enable_attention_slicing()

prompt = "indian ocean with beach"
image = pipe(prompt).images[0]

image.save("ocean.png")
print(f"Image saved as 'occean.png'")