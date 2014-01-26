'''
Script for downloading and converting all 
Madison Metro stops to GeoJSON.

Uses Python 2.7+

GeoJSON code based largely on http://github.com/jczaplew/postgis2geojson

'''
import urllib2
import os
import csv
import re
import json
import shutil
from StringIO import StringIO
from zipfile import ZipFile

# Request the zip file
request = urllib2.urlopen("http://www.cityofmadison.com/metro/gtfs/mmt_gtfs.zip")

print "Requesting data from Madison Metro..."

# Extract the contents of the zipfile
with ZipFile(StringIO(request.read())) as zf:
  zf.extractall("temp_dir")

print "Data recieved - now parsing..."

# Rename stops.txt to stops.csv for ease of parsing
os.rename("temp_dir/stops.txt", "temp_dir/stops.csv")

# The base of the GeoJSON
feature_collection = {'type': 'FeatureCollection', 'features': []}

# Open stops.csv
with open("temp_dir/stops.csv", "rb") as stops:
  reader = csv.reader(stops)

  # For each stop...
  for each in reader:
    # Skip the first row - it's field names
    if each[4] != 'stop_lat':

      # Remove EB, WB, SB, NB...I don't like 'em
    ## This could be cleaned up so that it's a single regex
      each[2] = re.sub(r'\[(.*)\]', '', each[2])
      each[2] = re.sub(r'\((.*)\)', '', each[2])

      # GeoJSON geometry object
      geometry = {
          'type': 'Point',
          'coordinates': [float(each[5]), float(each[4])]
      }

      # GeoJSON feature object
      feature = {
          'type': 'Feature',
          'geometry': geometry,
          'properties': {},
      }
      # Add the stop ID and name to the feature properties
      feature['properties']['id'] = each[1]
      feature['properties']['name'] = each[2].title()

      # Add the feature (bus stop) to the FeatureCollection
      feature_collection['features'].append(feature)

  # JSON-ify the FeatureCollection
  jsonified = json.dumps(feature_collection)

  # Save it to a GeoJSON file
  with open('stops.geojson', 'w') as outfile:
      outfile.write(jsonified)

stops.close()

# Delete the original folder we downloaded
shutil.rmtree('temp_dir')

print "Done! Data saved to 'stops.gejson'"