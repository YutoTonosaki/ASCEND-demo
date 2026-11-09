"""CPU reference renders, NOT a developed endpoint or approved region selection."""
import bpy
from mathutils import Vector
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 12
scene.cycles.use_denoising = False
scene.render.resolution_x = 480
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.color = (.12, .12, .12)

for name, location, energy, size in [
        ('KEY', (2, -3, 4), 400, 4), ('FILL', (-2, -1, 2), 200, 3),
        ('RIM', (0, 3, 3), 350, 3)]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

camera = bpy.data.objects.new('REFERENCE_CAMERA', bpy.data.cameras.new('REFERENCE_CAMERA'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.05


def render(name, position, target, scale=2.05):
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = scale
    scene.render.filepath = str(HERE / 'evidence' / (name + '.png'))
    bpy.ops.render.render(write_still=True)


render('neutral-front', (0, -4, .9), (0, 0, .9))
body = bpy.data.objects['athlete-body']
color = body.data.color_attributes.new(name='UNREVIEWED_joint_support', type='FLOAT_COLOR', domain='POINT')
groups = {group.index for group in body.vertex_groups
          if group.name.startswith(('REF_joint_influence_upperarm01', 'REF_joint_influence_upperarm02'))}
for vertex in body.data.vertices:
    weight = min(1, sum(g.weight for g in vertex.groups if g.group in groups))
    color.data[vertex.index].color = (.04 + .9 * weight, .25 * (1 - weight), .35 * (1 - weight), 1)
material = bpy.data.materials.new('UNREVIEWED_joint_support_NOT_muscle_mask')
material.use_nodes = True
nodes = material.node_tree.nodes
attribute = nodes.new('ShaderNodeVertexColor')
attribute.layer_name = color.name
pbr = nodes.get('Principled BSDF')
pbr.inputs['Roughness'].default_value = .78
material.node_tree.links.new(attribute.outputs['Color'], pbr.inputs['Base Color'])
body.data.materials[0] = material
render('UNREVIEWED-joint-support-front', (0, -4, .9), (0, 0, .9))
render('UNREVIEWED-joint-support-side', (4, 0, .9), (0, 0, .9))
render('UNREVIEWED-joint-support-back', (0, 4, .9), (0, 0, .9))
render('UNREVIEWED-joint-support-closeup', (1.6, -3, 1.35), (.18, 0, 1.3), .65)
# Do not save heatmap material over the neutral authoring project.
print('REFERENCE_VIEWS_RENDERED; no muscle region/endpoint approved')
