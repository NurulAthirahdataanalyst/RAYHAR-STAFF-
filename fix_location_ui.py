import codecs
import re

# GPSLocationTracker.tsx
with codecs.open('src/pages/GPSLocationTracker.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace Off-Site
content = content.replace(
    '''<div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    Off-Site
                                  </span>''',
    '''<div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    Off-Site {h.is_update ? "- UPDATED" : ""}
                                  </span>'''
)

# Replace On-Site
content = content.replace(
    '''<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    On-Site
                                  </span>''',
    '''<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    On-Site {h.is_update ? "- UPDATED" : ""}
                                  </span>'''
)

with codecs.open('src/pages/GPSLocationTracker.tsx', 'w', 'utf-8') as f:
    f.write(content)

# StaffProfileDialog.tsx
with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace Off-Site
content = content.replace(
    '''<div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                          Off-Site
                                        </span>''',
    '''<div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                          Off-Site {h.is_update ? "- UPDATED" : ""}
                                        </span>'''
)

# Replace On-Site
content = content.replace(
    '''<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          On-Site
                                        </span>''',
    '''<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          On-Site {h.is_update ? "- UPDATED" : ""}
                                        </span>'''
)

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated UIs")
