# Georgetown Potomac: Water Quality Analysis

## Overview
This project analyzes water quality parameters of the Potomac River near Georgetown waterfront in Washington, DC, using satellite remote sensing data from 2023. It implements a comprehensive analysis of multiple water quality indicators through Sentinel-2 and Landsat-8 satellite imagery.

## Study Area
![Georgetown Potomac River Study Area](./images/study_area_screenshot.png)

*Figure 1: Study area along the Georgetown waterfront section of the Potomac River. Image © Google Earth*

## Features
- **Multi-satellite analysis**: Combines higher resolution Sentinel-2 (10m) data with thermal-capable Landsat-8 (30m) imagery
- **Cloud filtering**: Implements cloud masking algorithms specific to each satellite platform
- **Multiple water quality parameters**:
  - NDWI (Normalized Difference Water Index) for water detection
  - Chlorophyll-a index as a proxy for algal concentration
  - Turbidity index for measuring water clarity
  - Water temperature (from Landsat-8 thermal band)
- **Temporal analysis**: Full year (2023) time series data
- **Visualization**: Time series charts and parameter distribution analysis

## Repository Structure
```
georgetown-potomac-water-quality/
│
├── code/
│   ├── potomac-analysis.js        			  # Main Google Earth Engine script
│   └── data_exploration.ipynb     			  # Jupyter notebook for data analysis
│
├── data/
│   ├── Potomac_Sentinel2_Water_Quality.csv  		  # Sentinel-2 derived metrics (29 observations)
│   └── Potomac_Landsat8_Water_Quality.csv   		  # Landsat-8 derived metrics with temperature
│
├── geo/
│   ├── potomac-geojson                      		  # Study area boundary in GeoJSON format
│   └── Potomac River Georgetown DC.kml      		  # Google Earth KML file of the study area
│
├── images/
│   ├── study_area_screenshot.png            		  # Google Earth image of the study area
│   ├── NDWI Time Series (Sentinel-2).png    		  # Water index time series
│   ├── Chlorophyll-a Index Time Series (Sentinel-2).png  # Algal activity indicators
│   ├── Turbidity Index Time Series (Sentinel-2).png      # Water clarity measurements
│   └── Water Temperature Time Series (Landsat-8).png     # Water temperature graph
│
├── docs/
│   ├── methodology.md             # Detailed explanation of processing methods
│   └── seasonal-analysis.md       # Interpretation of seasonal patterns
│
├── .gitignore                     # Git configuration for ignored files
├── LICENSE                        # MIT License file
├── README.md                      # This documentation file
├── CONTRIBUTING.md                # Guidelines for contributing to the project
└── citation-file                  # Citation information for academic reference
```

## Key Findings
- Water quality parameters in the Georgetown section of the Potomac River show expected seasonal patterns
- Turbidity increases during spring months (March-June), likely corresponding to rainfall events
- Chlorophyll-a levels fluctuate seasonally with some potential algal activity increases in fall
- Water temperature shows seasonal warming/cooling cycle (7°C in fall to 30°C in summer), though winter temperature data is unavailable

## Methodology

The analysis methodology combines:

1. **Satellite Data Processing**: We use Sentinel-2 (for optical bands) and Landsat-8 (for temperature) imagery processed through Google Earth Engine.

2. **Water Quality Indices**: 
   - NDWI calculated from green and NIR bands
   - Chlorophyll-a index derived from NIR and red band ratio
   - Turbidity index based on red to green band ratio
   - Water temperature extracted from Landsat thermal band

3. **Time Series Analysis**: We analyze temporal patterns across 2023 and their seasonal variations.

For detailed methodology, see `docs/methodology.md`.

## Seasonal Patterns

Our analysis reveals distinct seasonal patterns in the Potomac River water quality:

- **Spring**: Highest turbidity with fluctuating NDWI values
- **Summer**: Highest water temperatures with stabilizing water quality parameters
- **Fall**: Elevated chlorophyll-a levels with lower, consistent NDWI values
- **Winter**: Limited data (especially for temperature) but generally stable parameters

Detailed seasonal analysis can be found in `docs/seasonal-analysis.md`.

## Limitations
- Remote sensing provides proxy measurements, not direct water quality testing
- Cloud cover can limit data availability, particularly in winter months
- Seasonal data gaps exist, particularly for water temperature where winter measurements are absent (NaN values)
- Spatial resolution constraints (10m for Sentinel-2, 30m for Landsat-8)
- Spectral band limitations compared to in-situ sampling

## Future Work
- Integration with in-situ water quality measurements for validation
- Expansion to multiple years for long-term trend analysis
- Correlation analysis between parameters (e.g., turbidity vs. chlorophyll-a)
- Integration with precipitation data to analyze runoff effects
- Comparison with official water quality monitoring data

## Usage

### Running the Analysis in Google Earth Engine
1. Copy the `code/potomac-analysis.js` file to your Google Earth Engine account
2. Update file paths in the script to match your environment if needed
3. Run the script to process satellite data and generate water quality parameters
4. View the time series charts in the Earth Engine console
5. (Optional) Execute the export tasks to save data to your Google Drive as CSV files

### Data Exploration
After exporting the CSV files, you can analyze the data using the provided Jupyter notebook:
1. Open `code/data_exploration.ipynb` in Jupyter or Google Colab
2. Update the paths to point to your CSV files in the `data/` directory
3. Run the notebook cells to:
   - Load and clean the CSV data
   - Generate time series visualizations
   - Perform correlation analysis between parameters
   - Create seasonal comparisons

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- European Space Agency (ESA) for Sentinel-2 data
- NASA/USGS for Landsat-8 data
- Google Earth Engine team for the platform and API

## Citation
If you use this analysis in your research, please cite as directed in the citation-file.
