from diffusers import DiffusionPipeline
import torch


pipe = DiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float32
)

device = "cuda" if torch.cuda.is_available() else "cpu"
pipe = pipe.to(device)

if device == "cpu" or (torch.cuda.is_available() and torch.cuda.get_device_properties(0).total_memory < 8e9):
    pipe.enable_attention_slicing()

prompt = "Taj Mahal"
image = pipe(prompt).images[0]

image.save("taj.png")
print(f"Image saved as 'taj.png'")

