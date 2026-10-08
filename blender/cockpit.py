"""Detailed FH16 cockpit study built from the supplied Volvo builder panorama.
Original geometry, metre units. Screen canvases are driven by the game.
"""
import bpy, math, random
from mathutils import Vector

def build(material, box, cyl, rod, panel, text, trim, chrome, black, cloth, glass, screen):
    front_text=text
    def interior_text(name,content,loc,size,mat):
        o=front_text(name,content,loc,size,mat);o.rotation_euler.z=0;return o
    text=interior_text
    top=material('dashboard_fabric',(.065,.071,.075),0,.95)
    plastic=material('dashboard_plastic',(.039,.043,.048),0,.68)
    button=material('switch_plastic',(.018,.023,.028),0,.56)
    ivory=material('headliner',(.49,.49,.44),0,.9)
    label=material('button_legend',(.59,.63,.63),0,.65)
    stitch=material('stitch',(.23,.24,.24),0,.82)
    green=material('indicator_green',(.08,.37,.24),0,.35)
    # Real exported microtexture, not an unsupported procedural shader.
    random.seed(6016)
    for mat,amplitude in [(top,.015),(cloth,.026)]:
        size=256;im=bpy.data.images.new(mat.name+'_weave',width=size,height=size,alpha=False)
        base=mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value[:3]
        pixels=[]
        for y in range(size):
            for x in range(size):
                grain=random.uniform(-amplitude,amplitude)+(.012 if (x+y)%4==0 else -.002)
                pixels.extend([max(.005,base[0]+grain),max(.005,base[1]+grain),max(.005,base[2]+grain),1])
        im.pixels.foreach_set(pixels);im.pack()
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
        mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    # Sculpted, asymmetric wrap-around dashboard. Stepped levels follow the reference.
    box('dash_top_driver',(-.63,2.67,2.39),(1.05,.71,.15),top,.075)
    box('dash_top_passenger',(.59,2.69,2.39),(1.23,.73,.16),top,.08)
    box('dash_passenger_fascia',(.66,2.35,2.12),(1.13,.20,.49),plastic,.07)
    box('dash_glovebox',(.71,2.245,2.00),(.77,.023,.29),trim,.045)
    box('glovebox_seam',(.71,2.228,2.00),(.73,.008,.008),black,0)
    box('glovebox_handle',(.69,2.21,2.09),(.17,.025,.036),chrome,.012)
    box('dash_lower_passenger',(.63,2.48,1.86),(1.15,.42,.15),plastic,.06)
    # Instrument binnacle with an angular eyebrow and chrome perimeter.
    box('instrument_binnacle',(-.65,2.48,2.55),(.70,.34,.33),plastic,.055)
    box('instrument_bezel',(-.65,2.287,2.555),(.615,.025,.252),trim,.025)
    box('instrument_screen',(-.65,2.269,2.555),(.574,.008,.217),screen,.012)
    box('instrument_eyebrow',(-.65,2.42,2.733),(.73,.47,.065),plastic,.035)
    for x in [-.988,-.316]:box('instrument_edge',(x,2.26,2.548),(.011,.011,.258),chrome,.004)
    # Angled centre console, display, switches and real physical climate knobs.
    box('console_shell',(.08,2.35,2.14),(.53,.29,.61),plastic,.055)
    box('console_face',(.08,2.174,2.12),(.50,.04,.55),trim,.025)
    box('navigation_bezel',(.085,2.30,2.584),(.436,.07,.306),button,.025)
    display=box('navigation_screen',(.085,2.256,2.584),(.386,.009,.252),screen,.012)
    for z in [2.39,2.32]:
        for i in range(5):
            x=-.116+i*.093
            box('console_switch',(x,2.127,z),(.080,.035,.048),button,.009)
            text('console_legend',['A','OFF','AUTO','!','P'][i],(x,2.103,z-.012),.019,label)
            if z==2.39:box('switch_indicator',(x,2.100,z+.012),(.012,.006,.003),green,.001)
    for x in [-.10,.06,.22]:
        cyl('climate_knob',(x,2.091,2.175),.055,.044,chrome,'Y',48)
        cyl('climate_knob_face',(x,2.061,2.175),.045,.020,button,'Y',48)
        rod('knob_pointer',(x,2.045,2.180),(x,2.045,2.214),.003,label)
    for x,content in [(-.10,'TEMP'),(.06,'FAN'),(.22,'AUTO')]:text('climate_legend',content,(x,2.09,2.098),.015,label)
    for i in range(5):box('climate_lower_switch',(-.13+i*.097,2.126,2.044),(.08,.023,.032),button,.006)
    # Start/stop button just to the right of the steering column.
    cyl('engine_start_ring',(-.29,2.158,2.394),.046,.027,chrome,'Y',48)
    cyl('engine_start_button',(-.29,2.132,2.394),.036,.026,button,'Y',48)
    text('start_label','START',(-.29,2.114,2.390),.011,label)
    # Horizontal air vents, individual blades and moving thumb tabs.
    for x,z,w in [(-1.055,2.48,.18),(.47,2.22,.27),(1.055,2.19,.20)]:
        box('vent_surround',(x,2.22,z),(w+.025,.07,.136),plastic,.024)
        box('vent_opening',(x,2.170,z),(w,.025,.106),black,.014)
        for j in range(5):box('vent_blade',(x,2.149,z-.044+j*.021),(w-.015,.026,.008),trim,.003)
        box('vent_adjust_tab',(x+.035,2.126,z),(.023,.016,.036),chrome,.005)
    # Passenger storage tray: recessed base with a proper raised, rounded rim.
    box('dash_tray_base',(.64,2.57,2.502),(.58,.38,.023),plastic,.08)
    for x in [.345,.935]:box('tray_side',(x,2.57,2.531),(.025,.31,.052),trim,.012)
    for y in [2.388,2.752]:box('tray_rim',(.64,y,2.531),(.52,.027,.052),trim,.014)
    # Twin cupholders project out from the passenger console.
    box('cupholder_support',(.63,2.04,2.05),(.61,.26,.055),plastic,.06)
    for x in [.475,.765]:
        cyl('cup_recess',(x,2.02,2.094),.106,.047,black,'Z',64)
        bpy.ops.mesh.primitive_torus_add(major_radius=.107,minor_radius=.018,major_segments=64,minor_segments=12,location=(x,2.02,2.119));o=bpy.context.object;o.name='cupholder_rim';o.data.materials.append(plastic)
        for a in [0,math.pi]:box('cupholder_grip',(x+math.cos(a)*.089,2.02,2.122),(.03,.075,.029),trim,.008)
    box('centre_storage_shelf',(.56,2.07,1.866),(.65,.35,.068),plastic,.048)
    box('centre_storage_lip',(.56,1.908,1.926),(.62,.04,.113),trim,.02)
    # Floor, mats, pedals, door lining and armrests.
    box('cab_interior_floor',(0,1.75,1.76),(2.16,2.27,.06),black,.03)
    box('driver_floor_mat',(-.66,1.9,1.798),(.62,.86,.009),trim,.015)
    for y in [1.6+i*.055 for i in range(13)]:box('floor_mat_rib',(-.66,y,1.805),(.51,.010,.005),black,.002)
    for x in [-.85,-.61]:
        pedal=box('pedal',(x,2.14,1.87),(.10,.07,.19),black,.012);pedal.rotation_euler[0]=-.35
        for z in [1.81+i*.026 for i in range(5)]:box('pedal_grip',(x,2.094,z),(.085,.009,.005),trim,.001)
    for side in [-1,1]:
        x=side*1.082
        box('door_inner_liner',(x,1.98,2.25),(.045,1.45,.50),plastic,.04)
        box('door_armrest',(x*.98,1.99,2.36),(.15,.79,.08),trim,.035)
        box('door_pull_handle',(x*.925,1.65,2.31),(.034,.19,.032),chrome,.01)
        box('door_speaker',(x*.982,2.38,2.04),(.032,.28,.21),black,.023)
        for y in [2.27+i*.026 for i in range(8)]:box('speaker_slit',(x*.962,y,2.045),(.006,.008,.14),trim,0)
    # Steering wheel: leather rim, three sculpted spokes, button pods and Volvo roundel.
    steering_start=set(bpy.data.objects)
    center=Vector((-.66,1.99,2.57));tilt=math.radians(63)
    # Ring plane is tilted toward the driver, as in the source panorama.
    bpy.ops.mesh.primitive_torus_add(major_radius=.226,minor_radius=.022,major_segments=96,minor_segments=16,location=center,rotation=(tilt,0,0));o=bpy.context.object;o.name='steering_leather_rim';o.data.materials.append(black)
    def wheelpoint(x,z,depth=0):return (center.x+x,center.y-z*math.cos(tilt)+depth,center.z+z*math.sin(tilt))
    for x in [-.105,.105]:
        rod('steering_spoke',wheelpoint(x*.45,0),wheelpoint(x*1.95,.012),.029,plastic)
        pod=box('steering_button_pod',wheelpoint(x,.004,-.013),(.106,.036,.075),button,.015);pod.rotation_euler[0]=math.pi/2-tilt
        for ix in [-.026,0,.026]:
            for iz in [-.018,.012]:box('wheel_switch',wheelpoint(x+ix,iz,-.035),(.019,.008,.018),trim,.004)
    rod('steering_lower_spoke',wheelpoint(0,-.03),wheelpoint(0,-.20),.033,plastic)
    rod('steering_lower_chrome',wheelpoint(0,-.07,-.020),wheelpoint(0,-.18,-.020),.013,chrome)
    hub=box('steering_airbag',wheelpoint(0,0,-.025),(.18,.077,.145),plastic,.038);hub.rotation_euler[0]=math.pi/2-tilt
    logo=wheelpoint(0,.023,-.073)
    bpy.ops.mesh.primitive_torus_add(major_radius=.026,minor_radius=.0035,major_segments=48,minor_segments=8,location=logo,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='steering_volvo_roundel';o.data.materials.append(chrome)
    rod('volvo_arrow',(logo[0]+.015,logo[1],logo[2]+.015),(logo[0]+.037,logo[1],logo[2]+.037),.003,chrome)
    rod('volvo_arrow',(logo[0]+.022,logo[1],logo[2]+.037),(logo[0]+.037,logo[1],logo[2]+.037),.003,chrome)
    rod('volvo_arrow',(logo[0]+.037,logo[1],logo[2]+.022),(logo[0]+.037,logo[1],logo[2]+.037),.003,chrome)
    text('steering_logo','VOLVO',(logo[0],logo[1]-.005,logo[2]-.005),.008,label)
    # Join the wheel for runtime steering animation; column and stalks stay fixed.
    wheel=[o for o in set(bpy.data.objects)-steering_start if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in wheel:o.select_set(True)
    bpy.context.view_layer.objects.active=wheel[0];bpy.ops.object.join();bpy.context.object.name='steering_assembly'
    rod('steering_column',(-.66,2.25,2.18),(-.66,2.06,2.55),.053,trim)
    cyl('column_sleeve',(-.66,2.28,2.15),.10,.15,black,'Z',48)
    for side in [-1,1]:
        rod('column_stalk',(-.66+side*.05,2.05,2.52),(-.66+side*.24,2.04,2.54),.009,button)
        box('stalk_handle',(-.66+side*.235,2.04,2.54),(.079,.035,.037),trim,.013)
    # Contoured seats with separate bolsters, lumbar insert, piping and suspension bases.
    for x in [-.66,.66]:
        box('seat_suspension',(x,1.34,1.935),(.42,.48,.22),black,.025)
        for z in [1.85,1.90,1.95,2.0]:box('suspension_bellow',(x,1.34,z),(.44,.50,.024),trim,.012)
        box('seat_cushion',(x,1.42,2.10),(.54,.59,.16),cloth,.075)
        box('seat_cushion_insert',(x,1.45,2.192),(.35,.47,.025),cloth,.035)
        for xx in [-.245,.245]:box('seat_side_bolster',(x+xx,1.38,2.20),(.085,.54,.16),trim,.04)
        box('seat_back',(x,1.12,2.60),(.51,.16,.77),cloth,.08)
        box('seat_lumbar',(x,1.224,2.49),(.36,.05,.26),cloth,.04)
        for xx in [-.235,.235]:box('seat_back_bolster',(x+xx,1.19,2.60),(.095,.14,.65),trim,.043)
        box('seat_headrest',(x,1.13,3.09),(.34,.14,.24),cloth,.068)
        for z in [2.26+i*.068 for i in range(9)]:rod('seat_stitch',(x-.16,1.215,z),(x+.16,1.215,z),.0012,stitch)
        for side in [-1,1]:box('seat_armrest',(x+side*.32,1.30,2.43),(.075,.44,.07),trim,.027)
    box('bunk',(0,.82,2.09),(2.11,.54,.17),cloth,.075)
    # Light headliner and overhead storage recreate the visible panoramic surround.
    box('headliner_ceiling',(0,1.92,3.59),(2.17,2.45,.055),ivory,.04)
    box('overhead_storage',(0,2.52,3.60),(2.20,.45,.20),ivory,.04)
    for x in [-.65,0,.65]:
        box('overhead_hatch',(x,2.282,3.55),(.60,.024,.18),ivory,.025)
        box('overhead_handle',(x,2.259,3.5),(.13,.01,.026),trim,.007)
    for x in [-1.066,1.066]:
        p=box('a_pillar_liner',(x,3.01,2.95),(.10,.18,1.16),ivory,.026);p.rotation_euler[0]=-.06
        rod('pillar_grab_handle',(x*.91,2.93,2.79),(x*.91,2.93,3.04),.018,ivory)
    box('windscreen_sensor',(0,2.95,3.36),(.16,.16,.24),trim,.034)
    for i in range(6):box('sensor_grille',(-.052+i*.021,2.861,3.285),(.006,.008,.055),black,.002)
    # Sun blinds and visor hardware.
    for x in [-.59,.59]:box('sun_blind',(x,3.00,3.49),(1.02,.035,.105),plastic,.018)
