"""Original modular study model from public Volvo FH16 Aero references.
Not a manufacturer CAD model. Blender front = +Y, up = +Z, metres.
Run: Blender --background --python blender/build_truck.py
"""
import bpy, math, os, sys
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from cockpit import build as build_cockpit
from exterior import wheels as build_wheels, detail as detail_exterior

def material(name,color,metal=0,rough=.5,alpha=1):
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,alpha)
    bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
    bs.inputs['Alpha'].default_value=alpha
    m.diffuse_color=(*color,alpha)
    if alpha<1: m.surface_render_method='DITHERED'
    return m
paint=material('body_paint',(.035,.09,.115),.65,.26)
black=material('rubber',(.019,.023,.026),0,.88)
trim=material('trim',(.025,.034,.04),.2,.45)
chrome=material('brushed_aluminium',(.52,.57,.59),.8,.3)
glass=material('glass',(.16,.25,.28),.1,.12,.18)
cloth=material('cloth',(.075,.082,.08),0,.95)
white=material('lettering',(.76,.82,.83),.4,.3)
led=material('running_light',(.9,.94,1),0,.2)
bs=led.node_tree.nodes.get('Principled BSDF'); bs.inputs['Emission Color'].default_value=(.8,.9,1,1); bs.inputs['Emission Strength'].default_value=3
screen=material('screen',(.012,.055,.07),.1,.25)

def finish(obj,name,mat):
    obj.name=name; obj.data.materials.append(mat); return obj

def box(name,loc,size,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Manufactured edge','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    finish(o,name,mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def cyl(name,loc,radius,depth,mat,axis='X',vertices=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=math.pi/2
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    finish(o,name,mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def rod(name,a,b,r,mat):
    mid=(Vector(a)+Vector(b))/2; d=Vector(b)-Vector(a)
    o=cyl(name,mid,r,d.length,mat,'Z',16)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return o

def text(name,content,loc,size,mat):
    curve=bpy.data.curves.new(name,'FONT');curve.body=content;curve.size=size;curve.align_x='CENTER';curve.extrude=.001
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,math.pi)
    o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def panel(name,vertices,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[tuple(range(len(vertices)))]);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    solid=o.modifiers.new('laminated panel','SOLIDIFY');solid.thickness=.016
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
    return o

# 6x4 chassis, 3.2 m front-to-first-drive axle spacing, study geometry.
for x in [-.46,.46]:box('chassis_rail',(x,-.7,1.0),(.17,6.5,.3),trim)
for y in [-2.9,-1.8,-.7,.5,1.5]:box('crossmember',(0,y,1.02),(1.2,.17,.2),trim)
build_wheels(material,box,cyl,rod,chrome,black,trim)

for x in [-1,1]:
    tank=cyl('fuel_tank',(x,-.25,.96),.36,1.8,chrome,'Y')
    for y in [-.85,.35]:box('tank_strap',(x,y,.99),(.69,.075,.74),trim,.04)
    box('lower_steps',(x,2.32,.66),(.37,1,.19),chrome)
    box('upper_steps',(x,2.19,1.0),(.4,.8,.16),chrome)
    box('airflow_side',(x,-.4,.78),(.13,2.45,.85),paint,.1)
box('adblue_tank',(-.9,-1.35,.85),(.55,.4,.47),trim)
cyl('fifth_wheel',(0,-2.1,1.4),.68,.1,trim,'Z')
box('rear_crossmember',(0,-3.72,.9),(2.25,.14,.3),trim)
for x in [-.86,.86]:box('rear_tail_light',(x,-3.81,.9),(.4,.035,.15),led)

# Cab shell. Windows remain openings; no opaque box inside the cab.
cab_start=set(bpy.data.objects)
box('cab_floor',(0,2,1.58),(2.43,2.7,.23),paint,.1)
box('cab_back',(0,.68,2.6),(2.43,.16,2.0),paint,.12)
for x in [-1.15,1.15]:
    box('cab_lower_side',(x,1.98,1.98),(.18,2.63,.67),paint,.07)
    box('cab_rear_pillar',(x,1.05,2.9),(.18,.64,1.2),paint,.06)
    pillar=box('cab_a_pillar',(x,3.13,2.92),(.14,.14,1.45),paint,.035);pillar.rotation_euler[0]=-.08
    panel('side_window',[(x,1.43,2.38),(x,2.99,2.38),(x,2.88,3.46),(x,1.43,3.46)],glass)
    box('window_frame',(x,2.15,2.34),(.14,1.9,.06),trim)
    box('door_handle',(x*1.077,1.32,2.11),(.025,.25,.06),trim)
    for z in [1.39,1.2]:box('cab_step',(x,2.52,z),(.18,.75,.12),trim)
    rod('mirror_arm',(x,3.0,3.06),(x*1.32,3.05,3.0),.035,trim)
    box('mirror_housing',(x*1.33,3.08,2.94),(.22,.23,.55),trim,.07)
    box('mirror_glass',(x*1.33,2.95,2.94),(.16,.025,.44),chrome)
    rod('cms_arm',(x,3.0,3.47),(x*1.27,3.02,3.47),.035,trim)
    box('cms_housing',(x*1.28,3.05,3.47),(.24,.43,.12),trim,.055)
    cyl('cms_lens',(x*1.28,3.27,3.47),.035,.014,glass,'Y',24)
    box('cms_monitor',(x*.86,2.66,3.01),(.245,.10,.66),trim,.02)
    box('cms_screen',(x*.86,2.599,3.01),(.211,.008,.60),screen,.01)

box('cab_front_lower',(0,3.3,1.94),(2.36,.33,.6),paint,.13)
box('front_fascia',(0,3.33,1.36),(2.36,.32,.56),paint,.11)
box('bumper',(0,3.4,.78),(2.44,.34,.34),trim,.09)
panel('windshield',[(-1.07,3.15,2.40),(1.07,3.15,2.40),(1.09,3.04,3.51),(-1.09,3.04,3.51)],glass)
box('windshield_bottom',(0,3.22,2.38),(2.27,.16,.12),trim,.04)
box('cab_roof',(0,2,3.66),(2.42,2.65,.22),paint,.12)
box('roof_extension',(0,1.87,3.99),(2.4,2.25,.58),paint,.1)
box('airflow_roof',(0,1.53,4.34),(2.38,1.57,.26),paint,.12)
box('sun_visor',(0,3.24,3.54),(2.32,.39,.18),trim,.055)
text('fh16_badge','FH16',(0,3.449,3.55),.15,white)
text('volvo_letters','V O L V O',(0,3.488,2.12),.105,chrome)

for z,width in [(1.7,1.68),(1.24,1.42)]:
    box('grille_frame',(0,3.52,z),(width,.09,.33),chrome,.055)
    box('grille_inset',(0,3.573,z),(width-.09,.015,.24),trim,.025)
    for i in range(21):
        x=(i-10)*(width-.16)/21
        box('grille_mesh',(x,3.594,z),(.016,.013,.22),chrome,0)
    for zz in [-.07,0,.07]:box('grille_mesh',(0,3.601,z+zz),(width-.1,.016,.012),chrome,0)
rod('diagonal_grille',(-.57,3.635,1.08),(.57,3.635,1.42),.027,chrome)
cyl('front_roundel',(0,3.651,1.25),.107,.018,chrome,'Y')
cyl('front_roundel_inner',(0,3.669,1.25),.08,.018,trim,'Y')
for x in [-.97,.97]:
    box('headlight_housing',(x,3.54,1.15),(.29,.09,.56),trim,.05)
    box('headlamp',(x,3.595,1.09),(.19,.016,.15),led,.024)
    rod('led_signature',(x-.085,3.608,.94),(x+.06,3.608,1.36),.016,led)
    rod('led_signature',(x-.085,3.608,.94),(x+.085,3.608,.94),.014,led)
for x in [-.56,.56]:
    rod('wiper',(x-.35,3.185,2.49),(x+.22,3.185,2.53),.013,trim)
box('numberplate',(0,3.584,.82),(.48,.016,.11),white,.01)

# FH16 cockpit rebuilt from the actual Volvo panorama supplied by the user.
build_cockpit(material,box,cyl,rod,panel,text,trim,chrome,black,cloth,glass,screen)

# Move the cab relative to the front axle to reproduce a ~6.93 m study envelope.
for obj in set(bpy.data.objects)-cab_start:
    obj.location.y-=.55

# Detail authored after cab placement, in the exported model coordinate system.
detail_exterior(material,box,cyl,rod,panel,text,paint,black,trim,chrome,led,glass)

# Subtle seams and shaped door edges make the manufactured panels readable under grazing light.
for x in [-1.247,1.247]:
    for a,b in [((x,.94,1.76),(x,.94,3.45)),((x,.94,1.76),(x,2.24,1.76)),((x,2.24,1.76),(x,2.4,2.31))]:rod('door_seam',a,b,.007,trim)
    box('cab_side_badge',(x,1.10,2.14),(.015,.27,.055),chrome,.004)

# Weighted normals preserve flat metal panels with rounded manufactured edges.
for obj in bpy.data.objects:
    if obj.type=='MESH' and len(obj.data.polygons)>6:
        try:
            normal=obj.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');normal.keep_sharp=True;normal.weight=50
            bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=normal.name)
        except Exception:pass

bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','fh16-aero-study.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models','fh16-aero.glb'),export_format='GLB',export_apply=True)
print('Exported original modular FH16 Aero study model')
