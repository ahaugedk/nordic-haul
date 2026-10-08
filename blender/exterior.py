"""Detailed original exterior modules for the Volvo FH16 Aero reference study."""
import bpy, math
from mathutils import Vector

def wheels(material, box, cyl, rod, chrome, black, trim):
    tiremat=material('tyre_compound',(.018,.021,.024),0,.86)
    sidewall=material('tyre_sidewall',(.030,.032,.034),0,.78)
    def tyre(name,center):
        # Revolved commercial-tyre profile; radius .565 m, nominal section .315 m.
        profile=[(-.158,.323),(-.169,.372),(-.174,.44),(-.16,.518),(-.139,.55),(-.10,.565),(.10,.565),(.139,.55),(.16,.518),(.174,.44),(.169,.372),(.158,.323)]
        verts=[];faces=[];n=96
        for px,r in profile:
            for i in range(n):
                a=math.tau*i/n;verts.append((center[0]+px,center[1]+r*math.cos(a),center[2]+r*math.sin(a)))
        for j in range(len(profile)-1):
            for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(tiremat)
        for p in mesh.polygons:p.use_smooth=True
        # Five circumferential channels and staggered shoulder sipes.
        for dx in [-.12,-.06,0,.06,.12]:
            bpy.ops.mesh.primitive_torus_add(major_radius=.563,minor_radius=.0045,major_segments=96,minor_segments=6,location=(center[0]+dx,center[1],center[2]),rotation=(0,math.pi/2,0));bpy.context.object.name=name+'_groove';bpy.context.object.data.materials.append(black)
        for side in [-1,1]:
            for r in [.375,.512]:
                bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.0025,major_segments=96,minor_segments=5,location=(center[0]+side*.166,center[1],center[2]),rotation=(0,math.pi/2,0));bpy.context.object.name=name+'_sidewall_bead';bpy.context.object.data.materials.append(sidewall)
        return o
    for axle,y in enumerate([1.35,-1.85,-3.22]):
        prefix='rear_axle_module_' if axle==2 else ''
        cyl(prefix+'axle_'+str(axle),(0,y,.56),.094,2.25,trim)
        if axle: cyl(prefix+'differential',(0,y,.58),.20,.31,trim)
        for side in [-1,1]:
            centers=[side*1.025] if axle==0 else [side*.785,side*1.132]
            for n,x in enumerate(centers):tyre(prefix+f'tyre_{axle}_{side}_{n}',(x,y,.565))
            x=centers[-1]+side*.183
            cyl(prefix+'rim_barrel',(centers[-1],y,.565),.305,.31,chrome)
            cyl(prefix+'rim_disc',(x,y,.565),.282,.018,chrome)
            bpy.ops.mesh.primitive_torus_add(major_radius=.297,minor_radius=.012,major_segments=80,minor_segments=12,location=(x,y,.565),rotation=(0,math.pi/2,0));bpy.context.object.name=prefix+'rim_flange';bpy.context.object.data.materials.append(chrome)
            cyl(prefix+'rim_hub',(x+side*.027,y,.565),.117,.052,chrome)
            cyl(prefix+'hub_cap',(x+side*.060,y,.565),.075,.017,trim)
            for k in range(10):
                a=math.tau*k/10
                cyl(prefix+'rim_vent',(x+side*.012,y+math.cos(a)*.218,.565+math.sin(a)*.218),.031,.006,black,vertices=28)
                cyl(prefix+'rim_bolt',(x+side*.032,y+math.cos(a)*.148,.565+math.sin(a)*.148),.012,.024,chrome,vertices=6)
            # Continuous curved mudguard instead of a slab floating over the tyres.
            if axle:
                verts=[];faces=[]
                for j in range(33):
                    a=math.radians(14+152*j/32)
                    for xx in [side*.57,side*1.345]:verts.append((xx,y+math.cos(a)*.622,.565+math.sin(a)*.622))
                for j in range(32):faces.append((2*j,2*j+1,2*j+3,2*j+2))
                mesh=bpy.data.meshes.new(prefix+'mudguard');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(prefix+'mudguard',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(trim)
                solid=o.modifiers.new('moulded guard thickness','SOLIDIFY');solid.thickness=.018;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
                for yy in [y-.58,y+.58]:box(prefix+'mud_flap',(side*.99,yy,.64),(.70,.025,.49),black,.015)


def detail(material,box,cyl,rod,panel,text,paint,black,trim,chrome,led,glass):
    # Replace rectangular front lamps and grilles with shaped, layered assemblies.
    prefixes=['grille_frame','grille_inset','grille_mesh','front_roundel','headlight_housing','headlamp','led_signature','diagonal_grille','roof_extension','lower_steps','upper_steps']
    for o in list(bpy.data.objects):
        if any(o.name.startswith(p) for p in prefixes):bpy.data.objects.remove(o,do_unlink=True)
    def shape(name,outline,y,depth,mat,bevel=.006):
        # outline = x/z polygon, extruded along Y.
        v=[(x,y,z) for x,z in outline]+[(x,y-depth,z) for x,z in outline];n=len(outline)
        faces=[tuple(range(n)),tuple(range(n,2*n))[::-1]]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
        if bevel:
            mod=o.modifiers.new('formed edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        return o
    def honeycomb(name,y,z0,width,height):
        verts=[];faces=[];r=.015;rows=int(height/(r*1.5));cols=int(width/(r*1.73));th=.0022
        for row in range(rows):
            for col in range(cols):
                cx=(col-cols/2)*r*1.73+(row%2)*r*.866;cz=z0+(row-rows/2)*r*1.5
                if abs(cx)>width/2-.024:continue
                for side in range(6):
                    a=math.pi/3*side;b=math.pi/3*(side+1)
                    aa=(cx+math.cos(a)*r,cz+math.sin(a)*r);bb=(cx+math.cos(b)*r,cz+math.sin(b)*r)
                    off=len(verts);dx=bb[0]-aa[0];dz=bb[1]-aa[1];length=math.hypot(dx,dz);nx=-dz/length*th;nz=dx/length*th
                    verts.extend([(aa[0]+nx,y,aa[1]+nz),(aa[0]-nx,y,aa[1]-nz),(bb[0]-nx,y,bb[1]-nz),(bb[0]+nx,y,bb[1]+nz)])
                    faces.append((off,off+1,off+2,off+3))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(chrome)
    # Coordinates are after the -0.55 m cab shift in the main script.
    shape('upper_grille_frame',[(-.91,1.86),(.91,1.86),(.85,1.60),(-.85,1.60)],3.023,.042,chrome,.014)
    shape('upper_grille_opening',[(-.86,1.83),(.86,1.83),(.81,1.625),(-.81,1.625)],3.068,.028,black,.012)
    honeycomb('upper_grille_honeycomb',3.076,1.726,1.65,.20)
    shape('lower_grille_frame',[(-.84,1.51),(.84,1.51),(.67,1.04),(-.67,1.04)],3.067,.052,chrome,.016)
    shape('lower_grille_opening',[(-.775,1.47),(.775,1.47),(.625,1.082),(-.625,1.082)],3.125,.022,black,.012)
    honeycomb('lower_grille_honeycomb',3.151,1.28,1.38,.32)
    rod('volvo_diagonal',(-.68,3.169,1.10),(.68,3.169,1.46),.018,chrome)
    bpy.ops.mesh.primitive_torus_add(major_radius=.073,minor_radius=.012,major_segments=64,minor_segments=12,location=(0,3.194,1.28),rotation=(math.pi/2,0,0));bpy.context.object.name='volvo_iron_mark';bpy.context.object.data.materials.append(chrome)
    cyl('volvo_mark_back',(0,3.188,1.28),.066,.012,trim,'Y',64)
    rod('iron_mark_arrow',(.051,3.19,1.331),(.103,3.19,1.383),.007,chrome)
    rod('iron_mark_arrow',(.077,3.19,1.383),(.103,3.19,1.383),.007,chrome)
    rod('iron_mark_arrow',(.103,3.19,1.357),(.103,3.19,1.383),.007,chrome)
    text('front_volvo_wordmark','VOLVO',(0,3.207,1.264),.024,chrome)
    lamp=material('lamp_lens',(.13,.18,.23),.18,.11)
    for side in [-1,1]:
        outline=[(side*.86,1.49),(side*1.13,1.55),(side*1.135,.98),(side*.83,.98)]
        shape('headlight_outer',outline,3.072,.12,trim,.021)
        inner=[(side*.90,1.45),(side*1.095,1.50),(side*1.102,1.025),(side*.87,1.025)]
        shape('headlight_lens',inner,3.2,.018,lamp,.017)
        for z in [1.20,1.335]:
            cyl('projector_reflector',(side*.997,3.221,z),.051,.014,chrome,'Y',40)
            cyl('projector_lens',(side*.997,3.237,z),.038,.009,glass,'Y',40)
        rod('led_signature',(side*1.079,3.25,1.468),(side*.902,3.25,1.055),.008,led)
        rod('led_signature',(side*.902,3.25,1.055),(side*1.08,3.25,1.055),.008,led)
        box('indicator_lens',(side*.99,3.24,1.011),(.18,.013,.014),chrome,.004)
    # Exterior step treads with visible anti-slip perforations and side apertures.
    for side in [-1,1]:
        for z,y,w,d in [(.67,2.34,.36,.55),(1.00,2.32,.32,.48),(1.30,2.29,.29,.41)]:
            box('access_step',(side*1.03,y,z),(w,d,.070),trim,.019)
            for ix in range(3):
                for iy in range(7):box('step_perforation',(side*1.03+(ix-1)*.08,y+(iy-3)*.05,z+.037),(.038,.022,.004),black,.004)
    # Rounded, tapering high-roof extension, one continuous manufactured skin.
    levels=[(3.70,1.205,.18,2.61),(3.83,1.20,.20,2.59),(4.12,1.19,.23,2.50),(4.28,1.155,.28,2.44)]
    verts=[]
    for z,x,rear,front in levels:
        verts.extend([(-x,rear,z),(x,rear,z),(x,front-.10,z),(x-.10,front,z),(-x+.10,front,z),(-x,front-.10,z)])
    faces=[tuple(range(18,24))]
    for j in range(3):
        for i in range(6):faces.append((j*6+i,j*6+(i+1)%6,(j+1)*6+(i+1)%6,(j+1)*6+i))
    mesh=bpy.data.meshes.new('roof_extension');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('roof_extension',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(paint)
    mod=o.modifiers.new('roof shoulders','BEVEL');mod.width=.065;mod.segments=5;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    # Visible rubber seals, wiper joints, paint seam lines, roof antennae.
    for side in [-1,1]:
        x=side*1.18
        rod('window_rubber',(x,.90,2.40),(x,2.42,2.40),.014,trim)
        rod('window_rubber',(x,.90,2.40),(x,.90,3.46),.014,trim)
        rod('window_rubber',(x,.90,3.46),(x,2.32,3.46),.014,trim)
        rod('window_rubber',(x,2.32,3.46),(x,2.42,2.40),.014,trim)
        box('door_recess_handle',(side*1.252,.94,2.17),(.019,.26,.072),trim,.017)
        box('door_latch',(side*1.267,.94,2.176),(.009,.15,.022),chrome,.007)
        rod('roof_antenna',(side*.78,1.00,4.06),(side*.78,1.08,4.35),.005,trim)
        box('rear_reflector',(side*.99,-3.835,.89),(.23,.015,.07),led,.005)
    box('registration_plate',(0,3.02,.82),(.52,.025,.12),chrome,.009)
    text('plate_characters','N O R D I C',(0,3.041,.79),.047,trim)
