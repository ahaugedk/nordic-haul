import bpy,os,bmesh,math,random,sys
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from refine_cockpit import refine
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'blender','fh16-aero-study.blend'))
# Add exported micro-normal maps to the reference cockpit materials.
random.seed(16)
for name in ['dashboard_fabric','dashboard_plastic','cloth']:
    mat=bpy.data.materials.get(name)
    if mat and not mat.get('micro_normal_finished',False):
        im=bpy.data.images.new(name+'_micro_normal',width=256,height=256,alpha=False)
        pixels=[]
        for y in range(256):
            for x in range(256):
                a=random.uniform(-.045,.045);b=random.uniform(-.045,.045)
                weave=.035 if (x+y)%4<2 else -.035
                pixels.extend([.5+a+weave,.5+b-weave,.99,1])
        im.pixels.foreach_set(pixels);im.colorspace_settings.name='Non-Color';im.pack()
        image=mat.node_tree.nodes.new('ShaderNodeTexImage');image.image=im
        normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.26
        mat.node_tree.links.new(image.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],mat.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
        mat['micro_normal_finished']=True
paint=bpy.data.materials.get('body_paint')
if paint:
    bs=paint.node_tree.nodes.get('Principled BSDF');bs.inputs['Coat Weight'].default_value=.45;bs.inputs['Coat Roughness'].default_value=.16
for o in bpy.data.objects:
    if o.type=='MESH' and o.name.startswith(('console_legend','climate_legend','start_label')) and not o.get('interior_legend_finished',False):
        o.rotation_euler.z=0;o['interior_legend_finished']=True
    if o.type=='MESH' and o.name.startswith(('climate_knob','engine_start_')) and not o.get('control_scale_finished',False):
        o.scale.x*=.67;o.scale.z*=.67;o['control_scale_finished']=True
    if o.type=='MESH' and o.name.startswith('navigation_') and not o.get('screen_size_finished',False):
        o.scale.x*=.58;o.scale.z*=.58;o['screen_size_finished']=True
    if o.type=='MESH' and o.name.startswith('instrument_screen') and not o.get('screen_size_finished',False):
        o.scale.x*=.52;o.scale.z*=.52;o['screen_size_finished']=True
    if o.type=='MESH' and o.name.startswith('instrument_bezel') and not o.get('screen_size_finished',False):
        o.scale.x*=.61;o.scale.z*=.61;o['screen_size_finished']=True
    if o.type=='MESH' and not o.get('dimensional_finish',False) and any(k in o.name for k in ['tyre_','rim_','hub_cap','axle_','differential','mudguard','mud_flap']):
        world=o.matrix_world.copy();inverse=world.inverted()
        for v in o.data.vertices:
            co=world@v.co
            if any(k in o.name for k in ['rim_','hub_cap']):co.x-=math.copysign(.07,co.x)
            co.x*=.93 if ('mudguard' in o.name or 'mud_flap' in o.name) else .957
            co.z*=.956
            v.co=inverse@co
        o['dimensional_finish']=True
    if o.type=='MESH' and o.name.startswith('navigation_') and not o.get('display_angle_finished',False):
        pivot=Vector((.085,1.75,2.584));offset=o.location-pivot
        a=-math.radians(18);x=offset.x*math.cos(a)-offset.y*math.sin(a);y=offset.x*math.sin(a)+offset.y*math.cos(a)
        o.location=Vector((pivot.x+x,pivot.y+y,o.location.z));o.rotation_euler.z+=a;o['display_angle_finished']=True
    if o.name.startswith('roof_extension') and o.type=='MESH':
        bm=bmesh.new();bm.from_mesh(o.data);bm.normal_update()
        remove=[f for f in bm.faces if f.normal.z<-.8 and f.calc_center_median().z<3.77]
        bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(o.data);bm.free()
    if o.type=='MESH' and any(o.name.startswith(p) for p in ['instrument_screen','navigation_screen','cms_screen']):
        mesh=o.data;uv=mesh.uv_layers.active or mesh.uv_layers.new(name='Display UV')
        xs=[v.co.x for v in mesh.vertices];zs=[v.co.z for v in mesh.vertices]
        lo,hi=min(xs),max(xs);bottom,top=min(zs),max(zs)
        for poly in mesh.polygons:
            for loop_index in poly.loop_indices:
                co=mesh.vertices[mesh.loops[loop_index].vertex_index].co
                uv.data[loop_index].uv=((co.x-lo)/(hi-lo),(co.z-bottom)/(top-bottom))
refine()
for o in bpy.data.objects:
    if o.type=='MESH' and not o.get('normal_orientation_finished',False) and o.name.startswith(('continuous_dash_top','sculpted_center_stack','upper_grille_','lower_grille_','headlight_outer','headlight_lens')):
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
        mod=o.modifiers.new('finished surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o['normal_orientation_finished']=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','fh16-aero-study.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models','fh16-aero.glb'),export_format='GLB',export_apply=True)
print('Display UVs and final model exported',flush=True)
