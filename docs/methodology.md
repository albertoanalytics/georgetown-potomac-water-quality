# Methodology

This document outlines the methodological approach used in the "Georgetown Potomac: Satellite Water Quality Parameter Analysis" project.

## Satellite Data Sources

### Sentinel-2 MSI
- **Provider**: European Space Agency (ESA)
- **Collection**: COPERNICUS/S2_SR (Surface Reflectance)
- **Spatial Resolution**: 10m for visual bands, 20m for NIR bands
- **Temporal Resolution**: 5-day revisit time
- **Key Bands Used**:
  - Band 3 (Green): 560 nm, 10m
  - Band 4 (Red): 665 nm, 10m
  - Band 8 (NIR): 842 nm, 10m

### Landsat-8 OLI/TIRS
- **Provider**: NASA/USGS
- **Collection**: LANDSAT/LC08/C02/T1_L2 (Surface Reflectance, Level-2)
- **Spatial Resolution**: 30m for optical bands, 100m for thermal (resampled to 30m)
- **Temporal Resolution**: 16-day revisit time
- **Key Bands Used**:
  - Band 3 (Green): 560 nm, 30m
  - Band 4 (Red): 655 nm, 30m
  - Band 5 (NIR): 865 nm, 30m
  - Band 10 (Thermal): 10,895 nm, 100m (resampled to 30m)

## Cloud Masking Procedures

### Sentinel-2 Cloud Masking
The cloud masking procedure for Sentinel-2 uses the Scene Classification Layer (SCL):
```javascript
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var shadowBitMask = 3;  // Cloud shadows
  var cloudBitMask = 9;   // Cloud high probability
  var cirrusBitMask = 10; // Thin cirrus
  
  var mask = scl.neq(shadowBitMask)
    .and(scl.neq(cloudBitMask))
    .and(scl.neq(cirrusBitMask));
    
  return image.updateMask(mask);
}
```

### Landsat-8 Cloud Masking
The cloud masking procedure for Landsat-8 uses the QA_PIXEL band:
```javascript
function maskL8clouds(image) {
  var qaMask = image.select('QA_PIXEL');
  var cloudMask = qaMask.bitwiseAnd(1 << 1).eq(0)
    .and(qaMask.bitwiseAnd(1 << 2).eq(0))
    .and(qaMask.bitwiseAnd(1 << 3).eq(0))
    .and(qaMask.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(cloudMask);
}
```

## Water Quality Parameters

### Normalized Difference Water Index (NDWI)
NDWI is used to detect water surfaces and monitor changes in water content.

**Formula**:
```
NDWI = (Green - NIR) / (Green + NIR)
```

**Implementation**:
- **Sentinel-2**: `normalizedDifference(['B3', 'B8'])`
- **Landsat-8**: `normalizedDifference(['SR_B3', 'SR_B5'])`

**Interpretation**:
- Values > 0.0: Likely water
- Used threshold of 0.1 in this analysis to confidently identify water pixels
- Higher values typically indicate clearer water or deeper water

### Chlorophyll-a Index
This index serves as a proxy for algal concentration in water bodies.

**Formula**:
```
Chl-a Index = NIR / Red
```

**Implementation**:
- **Sentinel-2**: `B8 / B4`
- **Landsat-8**: `SR_B5 / SR_B4`

**Interpretation**:
- Higher values suggest increased chlorophyll-a concentration
- Seasonal patterns typically follow algal growth cycles
- Variations can indicate potential algal blooms

### Turbidity Index
This index estimates water clarity and suspended sediment concentration.

**Formula**:
```
Turbidity Index = Red / Green
```

**Implementation**:
- **Sentinel-2**: `B4 / B3`
- **Landsat-8**: `SR_B4 / SR_B3`

**Interpretation**:
- Higher values indicate higher turbidity (less clear water)
- Typically increases after rainfall events due to runoff
- Seasonal variations reflect watershed dynamics

### Water Temperature
Direct measurement from Landsat-8's thermal band.

**Formula**:
```
Temperature (°C) = (Band10 * 0.00341802 + 149.0) - 273.15
```

**Implementation**:
- Convert Digital Numbers to Top of Atmosphere (TOA) brightness temperature
- Convert from Kelvin to Celsius by subtracting 273.15
- Apply water mask to extract only water temperature

**Interpretation**:
- Direct measurement of surface water temperature
- Strong seasonal pattern expected
- Important for understanding ecosystem dynamics

## Filtering and Quality Control

1. **Time Period**: January 1, 2023 to December 31, 2023
2. **Cloud Coverage**: Images filtered to include only those with less than 30% cloud cover
3. **Water Detection**: Applied NDWI threshold of 0.1 to create water masks
4. **Minimum Water Pixels**:
   - Sentinel-2: At least 100 water pixels required
   - Landsat-8: At least 10 water pixels required (adjusted for lower resolution)

## Statistical Analysis

For each parameter, the following statistics were calculated:
- Mean value within the water mask for each date
- Temporal trends across the study period
- Correlation with other water quality parameters

The analysis was performed using Google Earth Engine's reducer functionality:
```javascript
var stats = maskedImage.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: potomacPolygon,
  scale: 10,  // 10m for Sentinel-2, 30m for Landsat-8
  maxPixels: 1e9
});
```

## Limitations

1. **Remote sensing constraints**:
   - Spectral limitations compared to in-situ measurements
   - Atmospheric effects can influence readings
   - Mixed pixels at water boundaries

2. **Proxy measurements**:
   - Indices serve as proxies, not direct measurements
   - Calibration with in-situ data would improve accuracy

3. **Temporal coverage**:
   - Cloud cover limits consistent temporal coverage
   - Higher latency between observations during cloudy periods
   - Winter observations particularly limited, especially for temperature data