"""Sculptural finishing pass, in the final Blender model coordinate system."""
import bpy,math,bmesh

def mesh_object(name,verts,faces,mat,bevel=.025):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[f[::-1] for f in faces]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('soft moulded contours','BEVEL');mod.width=bevel;mod.segments=5;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    mod=o.modifiers.new('surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    uv=o.data.uv_layers.new(name='Physical material UV')
    for poly in o.data.polygons:
        for i in poly.loop_indices:
            co=o.data.vertices[o.data.loops[i].vertex_index].co
            uv.data[i].uv=(co.x*4,(co.y if abs(poly.normal.z)>.6 else co.z)*4)
    return o

def refine():
    if bpy.context.scene.get('cockpit_contour_pass',False):
        for o in bpy.data.objects:
            if o.name in ['continuous_dash_top','sculpted_center_stack'] and not o.data.uv_layers:
                uv=o.data.uv_layers.new(name='Physical material UV')
                for poly in o.data.polygons:
                    for i in poly.loop_indices:
                        co=o.data.vertices[o.data.loops[i].vertex_index].co
                        uv.data[i].uv=(co.x*4,(co.y if abs(poly.normal.z)>.6 else co.z)*4)
        return
    top=bpy.data.materials['dashboard_fabric'];plastic=bpy.data.materials['dashboard_plastic']
    for o in list(bpy.data.objects):
        if o.name.startswith(('dash_top_driver','dash_top_passenger','console_shell','console_face')):bpy.data.objects.remove(o,do_unlink=True)
    # Smooth asymmetrical top footprint; the centre wraps inward toward the driver.
    stations=[(-1.10,1.73,2.48,2.42),(-.98,1.68,2.49,2.44),(-.78,1.66,2.50,2.45),(-.50,1.69,2.51,2.44),(-.30,1.77,2.51,2.43),(-.12,1.87,2.50,2.42),(.13,1.90,2.48,2.41),(.45,1.77,2.47,2.42),(.75,1.79,2.47,2.43),(1.05,1.84,2.47,2.42),(1.13,1.91,2.46,2.41)]
    verts=[]
    for x,back,front,z in stations:
        verts.extend([(x,back,z-.075),(x,back,z),(x,front,z+.025),(x,front,z-.075)])
    faces=[(3,2,1,0),tuple(range((len(stations)-1)*4,len(stations)*4))]
    for j in range(len(stations)-1):
        for k in range(4):faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
    mesh_object('continuous_dash_top',verts,faces,top,.020)
    # Sloped centre-stack housing, widening into the dash above the climate controls.
    levels=[(1.82,.21,1.515,1.91),(1.95,.23,1.53,1.93),(2.15,.245,1.57,1.96),(2.39,.255,1.61,1.985),(2.48,.25,1.67,2.02)]
    verts=[]
    for z,w,front,back in levels:verts.extend([(.08-w,front,z),(.08+w,front,z),(.08+w,back,z),(.08-w,back,z)])
    faces=[(3,2,1,0),tuple(range(16,20))]
    for j in range(4):
        for k in range(4):faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
    mesh_object('sculpted_center_stack',verts,faces,plastic,.022)
    # Leather wheel material, with subdued grain and fine specular response.
    leather=bpy.data.materials.get('steering_leather') or bpy.data.materials['rubber'].copy();leather.name='steering_leather'
    bs=leather.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.018,.021,.023,1);bs.inputs['Roughness'].default_value=.69
    tex=bpy.data.images.get('cloth_micro_normal')
    if tex:
        node=leather.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex;normal=leather.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.14
        leather.node_tree.links.new(node.outputs['Color'],normal.inputs['Color']);leather.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    for o in bpy.data.objects:
        if o.name.startswith('steering_assembly'):
            for i,m in enumerate(o.data.materials):
                if m and m.name=='rubber':o.data.materials[i]=leather
    bpy.context.scene['cockpit_contour_pass']=True
