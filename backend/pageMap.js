// pageMap.js
// This file maps class and experiment codes to their corresponding HTML files.

const classPages = {
  5: "class5list.html",
  6: "class6list.html",
  7: "class7list.html",
};

const experimentPages = {
  5: { // Class 5 Experiments
    1: "class5/C5E1.html",
    2: "class5/C5E2.html",
    3: "class5/C5E3.html",
    4: "class5/C5E4.html",
    5: "class5/C5E5.html",
    6: "class5/C5E6.html",
    7: "class5/C5E7.html"
  },
  6: { // Class 6 Experiments
    1: "class6/C6E1.html",
    2: "class6/C6E2.html",
    3: "class6/C6E3.html",
    4: "class6/C6E4.html",
    5: "class6/C6E5.html",
    6: "class6/C6E6.html",
  },
  7: { // Class 7 Experiments
    1: "class7/C7E1.html",
    2: "class7/C7E2.html",
    3: "class7/C7E3.html",
    4: "class7/C7E4.html",
    5: "class7/C7E5.html",
    6: "class7/C7E6.html",
  },
};

module.exports = { classPages, experimentPages };
