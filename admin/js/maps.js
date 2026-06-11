// ==================== ENTRY POINT ====================

const apiClient = new ApiClient('/api');
//top-left : 10.947849, 106.532560, 17z bottom-right: 10.629144, 106.828837, 17z
// Shared state
let locationsData = [];
let filteredLocations = [];

window.addEventListener('load', async () => {
    await window.loadTileCenters(); // load tile centers trước khi render pointr
    await loadLocations();
    enableGalleryDragScroll();
    initGalleryClickListener();
    initPathSvg();
    initContainerScrollListener();
    initKeyboardListener();
    await initFilterListeners();
    initPointrDrag();
    initEditorListener();
    initSettings();
    initSearch();

    // Test pointr
    const allPointrs = [
      {
        "name": "Trung Tâm Y Khoa Diag",
        "latitude": 10.829389,
        "longitude": 106.681626
      },
      {
        "name": "Trung Tâm Y Khoa Diag",
        "latitude": 10.799748,
        "longitude": 106.669596
      },
      {
        "name": "Trung Tâm Y Khoa Diag - Cách Mạng Tháng 8",
        "latitude": 10.791971,
        "longitude": 106.655432
      },
      {
        "name": "Phòng chờ xe Hải Vân Limousine Hồ Chí Minh - Vũng Tàu",
        "latitude": 10.769824,
        "longitude": 106.700088
      },
      {
        "name": "Diag Laboratories",
        "latitude": 10.818625,
        "longitude": 106.678662
      },
      {
        "name": "Tan Binh Hospital",
        "latitude": 10.7945055,
        "longitude": 106.65498559999999
      },
      {
        "name": "Thong Nhat Hospital",
        "latitude": 10.7915459,
        "longitude": 106.65347419999999
      },
      {
        "name": "Binh Tan District Hospital",
        "latitude": 10.7643601,
        "longitude": 106.6032103
      },
      {
        "name": "Tan Phu District Hospital",
        "latitude": 10.783638,
        "longitude": 106.6422004
      },
      {
        "name": "Tan Phu District Hospital",
        "latitude": 10.783638,
        "longitude": 106.6422004
      },
      {
        "name": "Tam Tri Saigon General Hospital",
        "latitude": 10.83175,
        "longitude": 106.62183
      },
      {
        "name": "Quoc Anh General Hospital",
        "latitude": 10.753473399999999,
        "longitude": 106.5931056
      },
      {
        "name": "International Neurosurgery Hospital (INH)",
        "latitude": 10.7612331,
        "longitude": 106.63213739999999
      },
      {
        "name": "District 10 Hospital",
        "latitude": 10.7762318,
        "longitude": 106.6666796
      },
      {
        "name": "Hyvong Hospital",
        "latitude": 10.789941599999999,
        "longitude": 106.6283078
      },
      {
        "name": "Tam Anh Hospital",
        "latitude": 10.802484999999999,
        "longitude": 106.6660436
      },
      {
        "name": "Cho Ray Hospital",
        "latitude": 10.7578646,
        "longitude": 106.6595131
      },
      {
        "name": "Benh Vien Xuyen A",
        "latitude": 10.92804,
        "longitude": 106.55816
      },
      {
        "name": "Hoan My Sai Gon General Hospital",
        "latitude": 10.800158699999999,
        "longitude": 106.684242
      },
      {
        "name": "Mỹ Đức General Hospital",
        "latitude": 10.7999169,
        "longitude": 106.6415827
      },
      {
        "name": "Trung tâm y tế quận Tân Phú",
        "latitude": 10.7871291,
        "longitude": 106.6334301
      }
    ];
    const coordinates = document.querySelector('.coordinates');
    let nSize = parseInt(document.getElementById('sSize').value);
    console.log('New size:', nSize);
    sizePer  = nSize/2400;

    setTimeout(() => {
      return;
      allPointrs.forEach(({ name, latitude, longitude }) => {
          const pos = latLonToPixel(latitude, longitude, sizePer);
          const { pointr } = createPointr(pos.left, pos.top, name, latitude, longitude);
          coordinates.appendChild(pointr);
      });
    }, 2000);

});
