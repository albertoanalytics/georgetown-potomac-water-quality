// Define your Potomac River polygon using the exact coordinates you provided
var potomacPolygon = ee.Geometry.Polygon([
  [
    [-77.06892306976445, 38.90357660033958],
    [-77.07011213688267, 38.90105842340812],
    [-77.0691094737583, 38.90077839775346],
    [-77.06842781705845, 38.90050601359771],
    [-77.06767245233972, 38.89958844764245],
    [-77.06671448395117, 38.89957413008023],
    [-77.06654868737631, 38.89993256646054],
    [-77.06649342392139, 38.90014762523855],
    [-77.06315914144665, 38.90007617722809],
    [-77.06170467897749, 38.89983301741845],
    [-77.06087679441703, 38.89933196295947],
    [-77.06010349717602, 38.89837181551984],
    [-77.0595746903418, 38.89751948566641],
    [-77.05960012458131, 38.89661145742379],
    [-77.05942602807336, 38.89489532363057],
    [-77.0593931258049, 38.89377942210569],
    [-77.05934373675201, 38.89271481303544],
    [-77.056245460545, 38.89326613969496],
    [-77.05670682949, 38.8943436178489],
    [-77.05690454347149, 38.89492082340078],
    [-77.05688787604052, 38.89698587244033],
    [-77.05680532497151, 38.89835828631055],
    [-77.05922916459613, 38.90055094963004],
    [-77.06169372876904, 38.90151947204082],
    [-77.06892306976445, 38.90357660033958]
  ]
]);

// Display the area of interest
Map.centerObject(potomacPolygon, 14);
Map.addLayer(potomacPolygon, {color: 'red'}, 'Potomac River Area');

// Time range for analysis
var startDate = '2023-01-01';
var endDate = '2023-12-31';
var waterThreshold = 0.1;

//------------------------ SENTINEL-2 ANALYSIS ------------------------//

// Load Sentinel-2 collection
var sentinel = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate(startDate, endDate)
  .filterBounds(potomacPolygon)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

print('Number of Sentinel-2 images found:', sentinel.size());

// Cloud masking function for Sentinel-2
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var shadowBitMask = 3; // Cloud shadows
  var cloudBitMask = 9; // Cloud high probability
  var cirrusBitMask = 10; // Thin cirrus
  
  // Create a mask for clouds and shadows
  var mask = scl.neq(shadowBitMask)
    .and(scl.neq(cloudBitMask))
    .and(scl.neq(cirrusBitMask));
    
  return image.updateMask(mask);
}

// Process Sentinel-2 collection
var processedS2 = sentinel.map(function(image) {
  // Apply cloud masking
  var maskedImage = maskS2clouds(image);
  
  // Calculate NDWI
  var ndwi = maskedImage.normalizedDifference(['B3', 'B8']).rename('NDWI');
  
  // Calculate Chlorophyll-a index
  var chlA = maskedImage.select('B8')
    .divide(maskedImage.select('B4'))
    .rename('CHL_A');
  
  // Calculate Turbidity index
  var turbidity = maskedImage.select('B4')
    .divide(maskedImage.select('B3'))
    .rename('TURBIDITY');
  
  // Create water mask
  var waterMask = ndwi.gt(waterThreshold);
  
  // Apply water mask
  var maskedNDWI = ndwi.updateMask(waterMask);
  var maskedChlA = chlA.updateMask(waterMask);
  var maskedTurbidity = turbidity.updateMask(waterMask);
  
  // Calculate statistics
  var stats = maskedNDWI.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 10,
    maxPixels: 1e9
  });
  var ndwiValue = ee.Number(stats.get('NDWI'));
  
  stats = maskedChlA.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 10,
    maxPixels: 1e9
  });
  var chlAValue = ee.Number(stats.get('CHL_A'));
  
  stats = maskedTurbidity.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 10,
    maxPixels: 1e9
  });
  var turbidityValue = ee.Number(stats.get('TURBIDITY'));
  
  stats = waterMask.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: potomacPolygon,
    scale: 10,
    maxPixels: 1e9
  });
  var waterPixels = ee.Number(stats.get('NDWI'));
  
  // Add date property
  var date = ee.Date(image.get('system:time_start'));
  
  // Return image with water quality bands and properties
  return maskedImage.addBands([maskedNDWI, maskedChlA, maskedTurbidity])
    .set('ndwi', ndwiValue)
    .set('chl_a', chlAValue)
    .set('turbidity', turbidityValue)
    .set('water_pixels', waterPixels)
    .set('date', date.format('YYYY-MM-dd'))
    .set('millis', date.millis());
});

//------------------------ LANDSAT 8 ANALYSIS ------------------------//

// Load Landsat 8 collection (Surface Reflectance)
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate(startDate, endDate)
  .filterBounds(potomacPolygon)
  .filter(ee.Filter.lt('CLOUD_COVER', 30));

print('Number of Landsat 8 images found:', landsat.size());

// Cloud masking function for Landsat 8
function maskL8clouds(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL');
  var cloudMask = qaMask.bitwiseAnd(1 << 1).eq(0)
    .and(qaMask.bitwiseAnd(1 << 2).eq(0))
    .and(qaMask.bitwiseAnd(1 << 3).eq(0))
    .and(qaMask.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(cloudMask);
}

// Scale the Landsat 8 bands correctly
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15); // Convert to Celsius
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBand, null, true);
}

// Process Landsat 8 collection
var processedL8 = landsat.map(function(image) {
  // Apply cloud masking
  var maskedImage = maskL8clouds(image);
  
  // Apply scaling factors
  var scaledImage = applyScaleFactors(maskedImage);
  
  // Calculate NDWI (using Green and NIR bands)
  var ndwi = scaledImage.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
  
  // Calculate Chlorophyll-a index (NIR/Red ratio)
  var chlA = scaledImage.select('SR_B5')
    .divide(scaledImage.select('SR_B4'))
    .rename('CHL_A');
  
  // Calculate Turbidity index (Red/Green ratio)
  var turbidity = scaledImage.select('SR_B4')
    .divide(scaledImage.select('SR_B3'))
    .rename('TURBIDITY');
  
  // Create water mask
  var waterMask = ndwi.gt(waterThreshold);
  
  // Apply water mask
  var maskedNDWI = ndwi.updateMask(waterMask);
  var maskedChlA = chlA.updateMask(waterMask);
  var maskedTurbidity = turbidity.updateMask(waterMask);
  var maskedTemp = scaledImage.select('ST_B10').updateMask(waterMask).rename('WATER_TEMP');
  
  // Calculate statistics
  var stats = maskedNDWI.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 30,
    maxPixels: 1e9
  });
  var ndwiValue = ee.Number(stats.get('NDWI'));
  
  stats = maskedChlA.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 30,
    maxPixels: 1e9
  });
  var chlAValue = ee.Number(stats.get('CHL_A'));
  
  stats = maskedTurbidity.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 30,
    maxPixels: 1e9
  });
  var turbidityValue = ee.Number(stats.get('TURBIDITY'));
  
  stats = maskedTemp.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: potomacPolygon,
    scale: 30,
    maxPixels: 1e9
  });
  var waterTempValue = ee.Number(stats.get('WATER_TEMP'));
  
  stats = waterMask.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: potomacPolygon,
    scale: 30,
    maxPixels: 1e9
  });
  var waterPixels = ee.Number(stats.get('NDWI'));
  
  // Add date property
  var date = ee.Date(image.get('system:time_start'));
  
  // Return image with water quality bands and properties
  return scaledImage.addBands([maskedNDWI, maskedChlA, maskedTurbidity, maskedTemp])
    .set('ndwi', ndwiValue)
    .set('chl_a', chlAValue)
    .set('turbidity', turbidityValue)
    .set('water_temp', waterTempValue)
    .set('water_pixels', waterPixels)
    .set('date', date.format('YYYY-MM-dd'))
    .set('millis', date.millis());
});

//------------------------ VISUALIZE RESULTS ------------------------//

// Filter collections for valid water pixels
var validS2 = processedS2.filter(ee.Filter.gt('water_pixels', 100));
var validL8 = processedL8.filter(ee.Filter.gt('water_pixels', 10));

// Get best images for display
var bestS2 = validS2.sort('CLOUDY_PIXEL_PERCENTAGE').first();
var bestL8 = validL8.sort('CLOUD_COVER').first();

// Add layers to map
Map.addLayer(bestS2.select(['B4', 'B3', 'B2']), 
             {min: 0, max: 3000, gamma: 1.4}, 
             'Sentinel-2 Natural Color');
             
Map.addLayer(bestS2.select('NDWI'), 
             {min: 0, max: 0.8, palette: ['darkblue', 'blue', 'cyan']}, 
             'Sentinel-2 NDWI');

Map.addLayer(bestL8.select(['SR_B4', 'SR_B3', 'SR_B2']), 
             {min: 0, max: 0.3, gamma: 1.4}, 
             'Landsat 8 Natural Color', false);

Map.addLayer(bestL8.select('WATER_TEMP'), 
             {min: 5, max: 25, palette: ['blue', 'cyan', 'yellow', 'red']}, 
             'Water Temperature (°C)');

//------------------------ TIME SERIES ANALYSIS ------------------------//

// Create time series collections
var s2TimeSeries = validS2.select(['NDWI', 'CHL_A', 'TURBIDITY']).sort('millis');
var l8TimeSeries = validL8.select(['NDWI', 'CHL_A', 'TURBIDITY', 'WATER_TEMP']).sort('millis');

// Create explicit Feature collections for time series charts
// Sentinel-2 NDWI time series
var s2NdwiFeatures = validS2.map(function(image) {
  return ee.Feature(null, {
    'system:time_start': image.get('millis'),
    'ndwi': image.get('ndwi')
  });
});

var ndwiChart = ui.Chart.feature.byFeature({
  features: s2NdwiFeatures,
  xProperty: 'system:time_start',
  yProperties: ['ndwi']
}).setOptions({
  title: 'NDWI Time Series (Sentinel-2)',
  vAxis: {title: 'NDWI Value'},
  hAxis: {title: 'Date', format: 'MM-yyyy'},
  lineWidth: 2,
  pointSize: 5,
  series: {0: {color: 'blue'}}
});

// Sentinel-2 Chlorophyll-a time series
var s2ChlAFeatures = validS2.map(function(image) {
  return ee.Feature(null, {
    'system:time_start': image.get('millis'),
    'chl_a': image.get('chl_a')
  });
});

var chlAChart = ui.Chart.feature.byFeature({
  features: s2ChlAFeatures,
  xProperty: 'system:time_start',
  yProperties: ['chl_a']
}).setOptions({
  title: 'Chlorophyll-a Index Time Series (Sentinel-2)',
  vAxis: {title: 'Chlorophyll-a Index'},
  hAxis: {title: 'Date', format: 'MM-yyyy'},
  lineWidth: 2,
  pointSize: 5,
  series: {0: {color: 'green'}}
});

// Sentinel-2 Turbidity time series
var s2TurbidityFeatures = validS2.map(function(image) {
  return ee.Feature(null, {
    'system:time_start': image.get('millis'),
    'turbidity': image.get('turbidity')
  });
});

var turbidityChart = ui.Chart.feature.byFeature({
  features: s2TurbidityFeatures,
  xProperty: 'system:time_start',
  yProperties: ['turbidity']
}).setOptions({
  title: 'Turbidity Index Time Series (Sentinel-2)',
  vAxis: {title: 'Turbidity Index'},
  hAxis: {title: 'Date', format: 'MM-yyyy'},
  lineWidth: 2,
  pointSize: 5,
  series: {0: {color: 'brown'}}
});

// Landsat-8 Water Temperature time series
var l8TempFeatures = validL8.map(function(image) {
  return ee.Feature(null, {
    'system:time_start': image.get('millis'),
    'water_temp': image.get('water_temp')
  });
});

var tempChart = ui.Chart.feature.byFeature({
  features: l8TempFeatures,
  xProperty: 'system:time_start',
  yProperties: ['water_temp']
}).setOptions({
  title: 'Water Temperature Time Series (Landsat-8)',
  vAxis: {title: 'Temperature (°C)'},
  hAxis: {title: 'Date', format: 'MM-yyyy'},
  lineWidth: 2,
  pointSize: 5,
  series: {0: {color: 'red'}}
});

// Print charts to console
print(ndwiChart);
print(chlAChart);
print(turbidityChart);
print(tempChart);

//------------------------ EXPORT DATA ------------------------//

// Create explicit feature collections for export
var s2ExportFeatures = validS2.map(function(image) {
  return ee.Feature(null, {
    'date': image.get('date'),
    'ndwi': image.get('ndwi'),
    'chl_a': image.get('chl_a'),
    'turbidity': image.get('turbidity'),
    'water_pixels': image.get('water_pixels')
  });
});

var l8ExportFeatures = validL8.map(function(image) {
  return ee.Feature(null, {
    'date': image.get('date'),
    'ndwi': image.get('ndwi'),
    'chl_a': image.get('chl_a'),
    'turbidity': image.get('turbidity'),
    'water_temp': image.get('water_temp'),
    'water_pixels': image.get('water_pixels')
  });
});

// Export to Drive
Export.table.toDrive({
  collection: s2ExportFeatures,
  description: 'Potomac_Sentinel2_Water_Quality',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: l8ExportFeatures,
  description: 'Potomac_Landsat8_Water_Quality',
  fileFormat: 'CSV'
});