import os
import sys
project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
print("PROJECT ROOT: ", project_root)
sys.path.insert(0, project_root)
print(sys.path)