/* global __initial_auth_token */

import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';

import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

const ADMIN_EMAILS = [
  'miy@belgacom.net',
  'hef@saintbar.be',
  'blv@saintbar.be'
];

const UNKNOWN_PROFESSOR_KEY = 'INCONNU';

const DAYS_OF_WEEK = [
  '1',
  '2',
  '3',
  '4',
  '5'
];

const HOURS_OF_DAY = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8'
];

const DAY_MAP = {
  '1': 'Lundi',
  '2': 'Mardi',
  '3': 'Mercredi',
  '4': 'Jeudi',
  '5': 'Vendredi'
};

const HOUR_MAP = {
  '1': '8h20-9h10',
  '2': '9h10-10h00',
  '3': '10h20-11h10',
  '4': '11h10-12h00',
  '5': '13h10-14h00',
  '6': '14h00-14h50',
  '7': '15h05-15h55',
  '8': '15h55-16h45'
};

const cleanField = (value) => {

  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/^"|"$/g, '');
};

const convertSetsToArrays = (obj) => {

  if (Array.isArray(obj)) {
    return obj.map(convertSetsToArrays);
  }

  if (
    typeof obj === 'object' &&
    obj !== null
  ) {

    const newObj = {};

    Object.keys(obj).forEach((key) => {

      if (obj[key] instanceof Set) {

        newObj[key] =
          Array.from(obj[key]);

      } else {

        newObj[key] =
          convertSetsToArrays(
            obj[key]
          );
      }

    });

    return newObj;
  }

  return obj;
};


/* =========================================================
   REGROUPEMENT DES CLASSES
   Exemple : 6A + 6B + 6C = 6ABC
========================================================= */

const groupClasses = (classes) => {

  const groups = {};

  classes.forEach((className) => {

    const value =
      String(className || '')
        .trim();

    if (!value) {
      return;
    }

    const match =
      value.match(
        /^(\d+)(.*)$/
      );

    if (match) {

      const level =
        match[1];

      const letters =
        match[2];

      if (!groups[level]) {
        groups[level] = [];
      }

      groups[level].push(
        letters
      );

    } else {

      if (!groups[value]) {
        groups[value] = [];
      }

      groups[value].push('');
    }

  });

  return Object.keys(groups)
    .sort()
    .map((level) => {

      const letters =
        groups[level]
          .join('')
          .split('')
          .filter(
            (
              value,
              index,
              array
            ) =>
              array.indexOf(value) ===
              index
          )
          .sort()
          .join('');

      return level + letters;
    })
    .join(' / ');
};


/* =========================================================
   REGROUPEMENT DES ENTREES D'UN PROFESSEUR
   Meme cours + meme local = classes regroupees
========================================================= */

const groupProfessorEntries = (
  entries
) => {

  const groups = {};

  entries.forEach((entry) => {

    const key =
      String(
        entry.course || ''
      ) +
      '|' +
      String(
        entry.room || ''
      );

    if (!groups[key]) {

      groups[key] = {

        course:
          entry.course,

        room:
          entry.room,

        classes: []

      };
    }

    groups[key].classes.push(
      entry.class
    );
  });

  return Object.keys(groups)
    .map((key) => ({

      course:
        groups[key].course,

      room:
        groups[key].room,

      classes:
        groupClasses(
          groups[key].classes
        )

    }));
};


/* =========================================================
   MODAL EMPLOI DU TEMPS INDIVIDUEL
========================================================= */

const ScheduleModal = ({
  entityName,
  scheduleType,
  scheduleData,
  onClose
}) => {

  const scheduleGrid = {};

  DAYS_OF_WEEK.forEach(
    (day) => {

      scheduleGrid[day] = {};

      HOURS_OF_DAY.forEach(
        (hour) => {

          scheduleGrid[day][hour] =
            [];

        }
      );

    }
  );


  scheduleData.forEach(
    (entry) => {

      const day =
        String(entry.day);

      const hour =
        String(entry.hour);

      if (
        DAYS_OF_WEEK.includes(day) &&
        HOURS_OF_DAY.includes(hour)
      ) {

        scheduleGrid[
          day
        ][
          hour
        ].push(
          entry
        );

      }

    }
  );


  const renderScheduleCell =
    (entries) => {

      if (
        !entries ||
        entries.length === 0
      ) {

        return null;

      }


      if (
        scheduleType ===
        'professors'
      ) {

        const grouped =
          groupProfessorEntries(
            entries
          );


      return (

  <div className="multi-entry">

    {grouped.map(
      (group, index) => (

        <React.Fragment key={index}>

          {index > 0 && ' / '}

          <strong>
            {group.course}
          </strong>

          {' '}

          {group.classes}

          {group.room &&
            group.room !== 'N/A' && (
              <>
                {' '}
                <span className="multi-room">
                  {group.room}
                </span>
              </>
            )}

        </React.Fragment>

      )
    )}

  </div>

);

      }


      if (
        scheduleType ===
        'classes'
      ) {

        return entries.map(
          (
            entry,
            index
          ) => (

            <div
              key={index}
              className="schedule-cell schedule-cell-green mb-1"
            >

              <div className="font-bold text-green-800 text-sm sm:text-base">

                {entry.course}

              </div>


              <div className="text-gray-700 text-xs mt-1">

                Prof :{' '}

                {entry.professorName}

              </div>


              <div className="text-gray-700 text-xs">

                Local :{' '}

                {entry.room}

              </div>

            </div>

          )
        );

      }


      if (
        scheduleType ===
        'rooms'
      ) {

        return entries.map(
          (
            entry,
            index
          ) => (

            <div
              key={index}
              className="schedule-cell schedule-cell-purple mb-1"
            >

              <div className="font-bold text-purple-800 text-sm sm:text-base">

                {entry.course}

              </div>


              <div className="text-gray-700 text-xs mt-1">

                Prof :{' '}

                {entry.professorName}

              </div>


              <div className="text-gray-700 text-xs">

                Classe :{' '}

                {entry.class}

              </div>

            </div>

          )
        );

      }


      return null;

    };


  let modalTitle = '';


  if (
    scheduleType ===
    'professors'
  ) {

    modalTitle =
      'Emploi du temps de ' +
      entityName;

  } else if (
    scheduleType ===
    'classes'
  ) {

    modalTitle =
      'Emploi du temps de la classe ' +
      entityName;

  } else if (
    scheduleType ===
    'rooms'
  ) {

    modalTitle =
      'Emploi du temps du local ' +
      entityName;

  } else {

    modalTitle =
      'Details pour ' +
      entityName;

  }


  const handlePrint = () => {

    window.print();

  };


  return (

    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 print-container">

      <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6 w-full max-w-6xl mx-auto print-area">

        <div className="flex justify-between items-center border-b pb-3 mb-4 print-header">

          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">

            {modalTitle}

          </h2>


          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-semibold no-print"
            aria-label="Fermer"
          >

            &times;

          </button>

        </div>


        {scheduleData.length > 0 ? (

          <div className="overflow-x-auto max-h-[70vh] pb-2 schedule-scroll">

            <table className="w-full min-w-[720px] bg-white border border-gray-300 rounded-lg table-fixed schedule-table">

              <thead className="bg-gray-100 sticky top-0 z-10">

                <tr>

                  <th className="py-2 px-2 sm:px-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-28 border-r border-gray-300">

                    Heure

                  </th>


                  {DAYS_OF_WEEK.map(
                    (dayKey) => (

                      <th
                        key={dayKey}
                        className="py-2 px-2 sm:px-3 text-center text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300"
                      >

                        {DAY_MAP[dayKey]}

                      </th>

                    )
                  )}

                </tr>

              </thead>


              <tbody>

                {HOURS_OF_DAY.map(
                  (hourKey) => (

                    <tr
                      key={hourKey}
                      className="schedule-row"
                    >

                      <td className="py-2 px-2 sm:px-3 text-xs sm:text-sm text-gray-800 font-bold text-center bg-gray-50 border-r border-b border-gray-300">

                        {HOUR_MAP[hourKey]}

                      </td>


                      {DAYS_OF_WEEK.map(
                        (dayKey) => (

                          <td
                            key={
                              dayKey +
                              '-' +
                              hourKey
                            }
                            className="p-1 sm:p-2 text-sm text-gray-800 align-top border-r border-b border-gray-300"
                          >

                            {renderScheduleCell(
                              scheduleGrid[
                                dayKey
                              ][
                                hourKey
                              ]
                            )}

                          </td>

                        )
                      )}

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (

          <p className="text-gray-600">

            Aucun emploi du temps trouve pour cette entite.

          </p>

        )}


        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 no-print">

          <button
            onClick={handlePrint}
            className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg shadow-md"
          >

            Imprimer

          </button>


          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md"
          >

            Fermer

          </button>

        </div>

      </div>
      <style>{`

  #multi-print-area {
    display: none;
  }

  @media print {

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    body * {
      visibility: hidden;
    }

    #multi-print-area,
    #multi-print-area * {
      visibility: visible;
    }

    #multi-print-area {
      display: block !important;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }

   .multi-print-page {
  width: 100%;
  box-sizing: border-box;

  break-after: page !important;
  page-break-after: always !important;

  break-inside: avoid !important;
  page-break-inside: avoid !important;

  overflow: visible !important;
}

.multi-print-page:last-child {
  break-after: auto !important;
  page-break-after: auto !important;
}

    .multi-print-header {
      height: 6mm;

      display: flex;
      align-items: center;
      justify-content: space-between;

      margin-bottom: 0,5mm;
    }

    .multi-print-header h1 {
      margin: 0;

      font-size: 10pt;
      font-weight: bold;
    }

    .multi-print-header span {
      font-size: 7pt;
    }

    .multi-print-table {
      width: 100%;

      border-collapse: collapse;
      table-layout: fixed;

      font-size: 6.5pt;

      line-height: 1.1;
    }

    .multi-print-table th,
    .multi-print-table td {
      border: 0.4pt solid #777;

      padding: 0.6mm;

      vertical-align: middle;

      overflow: hidden;
    }

    .multi-print-table thead th {
      height: 6mm;

      background: #eeeeee !important;

      font-size: 7.5pt;

      font-weight: bold;

      text-align: center;
    }

    /* Colonne JOUR très étroite */

.multi-time-column {
  width: 4mm;
  padding: 0 !important;
}

.multi-hour-column {
  width: 4mm;
  padding: 0 !important;
}

.multi-day {
  width: 4mm;
  padding: 0 !important;
  font-size: 5.5pt;
  font-weight: bold;
  text-align: center;
  background: #f2f2f2 !important;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.multi-hour {
  width: 4mm;
  padding: 0 !important;
  font-size: 6pt;
  font-weight: bold;
  text-align: center;
  background: #fafafa !important;
}

.multi-course-cell {
  height: 5.5mm !important;
  max-height: 5.5mm !important;
  padding: 0.2mm !important;
  text-align: center;
  white-space: nowrap !important;
  overflow: hidden !important;
  vertical-align: middle !important;
}

.multi-entry {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  font-size: 5.5pt;
  overflow: hidden !important;
  text-overflow: clip;
}


    .first-hour-day td {
      border-top-width: 1.2pt;
      border-top-color: #333;
    }
.multi-print-table tbody tr {
  height: 5.4mm !important;
  max-height: 5.4mm !important;
}

.multi-print-table tbody td {
  height: 5.4mm !important;
  max-height: 5.4mm !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.multi-course-cell {
  height: 5.4mm !important;
  max-height: 5.4mm !important;
  padding: 0 0.2mm !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  vertical-align: middle !important;
}

.multi-entry {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 5.2pt !important;
  line-height: 5mm !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: clip !important;
}

.multi-entry strong,
.multi-entry span {
  white-space: nowrap !important;
}
  }
  .multi-entry strong,
.multi-entry span {
  white-space: nowrap !important;
}

`}</style>

    </div>

  );

};


/* =========================================================
   VUE D'IMPRESSION MULTIPLE
========================================================= */

const MultiPrintView = ({
  scheduleType,
  selectedEntities,
  allSchedules
}) => {

  if (
    !selectedEntities ||
    selectedEntities.length === 0
  ) {
    return null;
  }

  const MAX_PER_PAGE = 8;

  const pages = [];

  for (
    let i = 0;
    i < selectedEntities.length;
    i += MAX_PER_PAGE
  ) {

    pages.push(
      selectedEntities.slice(
        i,
        i + MAX_PER_PAGE
      )
    );
  }


  const getEntriesForSlot = (
    entity,
    day,
    hour
  ) => {

    const entries =
      allSchedules[
        scheduleType
      ]?.[
        entity
      ] || [];

    return entries.filter(
      (entry) =>
        String(entry.day) === day &&
        String(entry.hour) === hour
    );
  };


  const renderCompactCell = (
    entries
  ) => {

    if (
      !entries ||
      entries.length === 0
    ) {
      return null;
    }


    if (
      scheduleType === 'professors'
    ) {

      const grouped =
        groupProfessorEntries(
          entries
        );

      return grouped.map(
        (group, index) => (

          <div
            key={index}
            className="multi-entry"
          >

            <strong>
              {group.course}
            </strong>

            {' '}

            {group.classes}

            {group.room &&
              group.room !== 'N/A' && (
                <>
                  {' '}
                  <span className="multi-room">
                    {group.room}
                  </span>
                </>
              )}

          </div>

        )
      );
    }


    if (
      scheduleType === 'classes'
    ) {

      return entries.map(
        (entry, index) => (

          <div
            key={index}
            className="multi-entry"
          >

            <strong>
              {entry.course}
            </strong>

            {' '}

            {entry.professorName}

            {entry.room &&
              entry.room !== 'N/A' && (
                <>
                  {' '}
                  <span className="multi-room">
                    {entry.room}
                  </span>
                </>
              )}

          </div>

        )
      );
    }


    if (
      scheduleType === 'rooms'
    ) {

      return entries.map(
        (entry, index) => (

          <div
            key={index}
            className="multi-entry"
          >

            <strong>
              {entry.course}
            </strong>

            {' '}

            {entry.professorName}

            {' '}

            {entry.class}

          </div>

        )
      );
    }


    return null;
  };


  let title =
    'Horaires sélectionnés';

  if (
    scheduleType === 'professors'
  ) {
    title =
      'Horaires des professeurs';
  }

  if (
    scheduleType === 'classes'
  ) {
    title =
      'Horaires des classes';
  }

  if (
    scheduleType === 'rooms'
  ) {
    title =
      'Horaires des locaux';
  }


  return (

    <div id="multi-print-area">

      {pages.map(
        (
          pageEntities,
          pageIndex
        ) => (

          <div
            key={pageIndex}
            className="multi-print-page"
          >

            <div className="multi-print-header">

              <h1>
                {title}
              </h1>

              {pages.length > 1 && (

                <span>
                  Page{' '}
                  {pageIndex + 1}
                  {' / '}
                  {pages.length}
                </span>

              )}

            </div>


            <table className="multi-print-table">

              <thead>

                <tr>

                  <th className="multi-time-column">
                    Jour
                  </th>

                  <th className="multi-hour-column">
                    H
                  </th>


                  {pageEntities.map(
                    (entity) => (

                      <th key={entity}>
                        {entity}
                      </th>

                    )
                  )}

                </tr>

              </thead>


              <tbody>

                {DAYS_OF_WEEK.map(
                  (day) => (

                    <React.Fragment
                      key={day}
                    >

                     {HOURS_OF_DAY
  .filter(
    (hour) =>
      day !== '3' ||
      Number(hour) <= 4
  )
  .map(
                        (
                          hour,
                          hourIndex
                        ) => (

                          <tr
                            key={
                              day +
                              '-' +
                              hour
                            }
                            className={
                              hourIndex === 0
                                ? 'first-hour-day'
                                : ''
                            }
                          >


                            {hourIndex === 0 && (

                              <td
                                rowSpan={
  day === '3'
    ? 4
    : HOURS_OF_DAY.length
}
                                className="multi-day"
                              >

                                {DAY_MAP[day]}

                              </td>

                            )}


                            <td className="multi-hour">

                              {hour}

                            </td>


                            {pageEntities.map(
                              (entity) => (

                                <td
                                  key={
                                    entity +
                                    '-' +
                                    day +
                                    '-' +
                                    hour
                                  }
                                  className="multi-course-cell"
                                >

                                  {renderCompactCell(

                                    getEntriesForSlot(
                                      entity,
                                      day,
                                      hour
                                    )

                                  )}

                                </td>

                              )
                            )}


                          </tr>

                        )
                      )}

                    </React.Fragment>

                  )
                )}

              </tbody>

            </table>

          </div>

        )
      )}

    </div>

  );
};

/* =========================================================
   APPLICATION
========================================================= */

function App() {


  const [
    professorHours,
    setProfessorHours
  ] =
    useState({});


  const [
    allSchedules,
    setAllSchedules
  ] =
    useState({

      professors: {},

      classes: {},

      rooms: {}

    });


  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    error,
    setError
  ] =
    useState(null);


  const [
    activeTab,
    setActiveTab
  ] =
    useState(
      'professors'
    );


  const [
    selectedEntity,
    setSelectedEntity
  ] =
    useState(null);


  const [
    isModalOpen,
    setIsModalOpen
  ] =
    useState(false);


  const [
    fileName,
    setFileName
  ] =
    useState(
      'Aucun fichier selectionne'
    );


  const [
    db,
    setDb
  ] =
    useState(null);


  const [
    isAuthReady,
    setIsAuthReady
  ] =
    useState(false);


  const [
    showAdminPanel,
    setShowAdminPanel
  ] =
    useState(false);


  const [
    showLogin,
    setShowLogin
  ] =
    useState(false);


  const [
    adminEmail,
    setAdminEmail
  ] =
    useState('');


  const [
    adminPassword,
    setAdminPassword
  ] =
    useState('');


  const [
    adminUser,
    setAdminUser
  ] =
    useState(null);


  const [
    loginError,
    setLoginError
  ] =
    useState('');


  const [
    importing,
    setImporting
  ] =
    useState(false);


  /* =======================================================
     NOUVEAU :
     SELECTION MULTIPLE POUR L'IMPRESSION
  ======================================================= */

  const [
    selectedForPrint,
    setSelectedForPrint
  ] =
    useState({

      professors: [],

      classes: []

    });


  const [
    showMultiPrint,
    setShowMultiPrint
  ] =
    useState(false);


  /* =======================================================
     INITIALISATION FIREBASE
  ======================================================= */

  useEffect(() => {


    try {


      const configText =

        typeof process.env.REACT_APP_FIREBASE_CONFIG !==
        'undefined'

          ? process.env.REACT_APP_FIREBASE_CONFIG

          : '{}';


      const firebaseConfig =

        JSON.parse(
          configText
        );


      if (
        Object.keys(
          firebaseConfig
        ).length === 0
      ) {


        setError(

          'Erreur de configuration de la base de donnees.'

        );


        setLoading(
          false
        );


        return;

      }


      const app =

        initializeApp(
          firebaseConfig
        );


      const authInstance =

        getAuth(
          app
        );


      const firestoreInstance =

        getFirestore(
          app
        );


      setDb(
        firestoreInstance
      );


      const unsubscribeAuth =

        onAuthStateChanged(

          authInstance,

          (user) => {


            setIsAuthReady(
              true
            );


            if (

              user &&

              !user.isAnonymous &&

              user.email &&

              ADMIN_EMAILS.includes(

                user.email.toLowerCase()

              )

            ) {


              setAdminUser(
                user
              );


            } else {


              setAdminUser(
                null
              );

            }


          }

        );


      if (

        typeof __initial_auth_token !==
        'undefined' &&

        __initial_auth_token

      ) {


        signInWithCustomToken(

          authInstance,

          __initial_auth_token

        ).catch(
          () => {


            signInAnonymously(
              authInstance
            );


          }
        );


      } else {


        signInAnonymously(
          authInstance
        );


      }


      return () => {


        unsubscribeAuth();


      };


    } catch (err) {


      console.error(
        err
      );


      setError(

        'Erreur d initialisation.'

      );


      setLoading(
        false
      );


    }


  }, []);


/* =======================================================
   ECOUTE FIRESTORE
======================================================= */

useEffect(() => {


  if (
    !db ||
    !isAuthReady
  ) {

    return;

  }


  setLoading(
    true
  );


  const scheduleRef =

    doc(

      db,

      'app_data',

      'current_schedule'

    );


  const unsubscribe =

    onSnapshot(

      scheduleRef,


      (docSnap) => {


        if (
          docSnap.exists()
        ) {


          const fileData =

            docSnap.data();


          if (
            fileData.schedules
          ) {


            setAllSchedules(

              fileData.schedules

            );


          }


          if (
            fileData.professorHours
          ) {


            setProfessorHours(

              fileData.professorHours

            );


          }


        }


        setLoading(
          false
        );


      },


      (err) => {


        console.error(
          err
        );


        setError(

          'Impossible de charger les plannings.'

        );


        setLoading(
          false
        );


      }

    );


  return () => {


    unsubscribe();


  };


}, [
  db,
  isAuthReady
]);
/* =======================================================
   CONNEXION ADMINISTRATEUR
======================================================= */

const handleAdminLogin =
  async (event) => {

    event.preventDefault();

    setLoginError('');


    const email =
      adminEmail
        .trim()
        .toLowerCase();


    if (
      !ADMIN_EMAILS.includes(email)
    ) {

      setLoginError(
        'Cette adresse e-mail n est pas autorisee.'
      );

      return;
    }


    if (
      !adminPassword
    ) {

      setLoginError(
        'Veuillez entrer votre mot de passe.'
      );

      return;
    }


    try {

      const authInstance =
        getAuth();


      const credential =
        await signInWithEmailAndPassword(
          authInstance,
          email,
          adminPassword
        );


      const connectedEmail =
        credential.user.email
          ? credential.user.email.toLowerCase()
          : '';


      if (
        !ADMIN_EMAILS.includes(
          connectedEmail
        )
      ) {

        await signOut(
          authInstance
        );


        setLoginError(
          'Ce compte n est pas autorise a administrer les horaires.'
        );

        return;
      }


      setAdminUser(
        credential.user
      );


      setAdminEmail('');

      setAdminPassword('');

      setLoginError('');

      setShowLogin(false);

      setShowAdminPanel(true);


    } catch (err) {

      console.error(err);

      setLoginError(
        'Adresse e-mail ou mot de passe incorrect.'
      );

    }

  };


/* =======================================================
   DECONNEXION
======================================================= */

const handleAdminLogout =
  async () => {

    try {

      const authInstance =
        getAuth();


      await signOut(
        authInstance
      );


      setAdminUser(null);

      setShowAdminPanel(false);


      await signInAnonymously(
        authInstance
      );


    } catch (err) {

      console.error(err);

      setError(
        'Erreur lors de la deconnexion.'
      );

    }

  };


/* =======================================================
   OUVERTURE ADMINISTRATION
======================================================= */

const handleSecretClick =
  () => {

    if (
      adminUser
    ) {

      setShowAdminPanel(true);

      return;

    }


    setLoginError('');

    setAdminEmail('');

    setAdminPassword('');

    setShowLogin(true);

  };


/* =======================================================
   IMPORT DU FICHIER GPU001.TXT
======================================================= */

const handleFileUpload =
  (event) => {

    const file =
      event.target.files &&
      event.target.files[0];


    if (
      !file ||
      !db ||
      !adminUser
    ) {

      return;
    }


    setFileName(
      file.name
    );


    setImporting(true);

    setError(null);


    const reader =
      new FileReader();


    reader.onload =
      async (e) => {

        try {

          const textContent =
            e.target.result;


          const schedules = {

            professors: {},

            classes: {},

            rooms: {}

          };


          const profHoursCounter =
            {};


          const lines =
            textContent.split(
              /\r?\n/
            );


          let importedLines = 0;

          let ignoredLines = 0;


          lines.forEach(
            (line) => {

              if (
                !line.trim()
              ) {

                return;

              }


              const columns =
                line.split(',');


              if (
                columns.length < 7
              ) {

                ignoredLines++;

                return;

              }


              const className =
                cleanField(
                  columns[1]
                ) ||
                'Classe inconnue';


              const profSigle =
                cleanField(
                  columns[2]
                ) ||
                UNKNOWN_PROFESSOR_KEY;


              const course =
                cleanField(
                  columns[3]
                ) ||
                'Cours inconnu';


              const room =
                cleanField(
                  columns[4]
                ) ||
                'N/A';


              const day =
                cleanField(
                  columns[5]
                );


              const hour =
                cleanField(
                  columns[6]
                );


              if (
                !day ||
                !hour
              ) {

                ignoredLines++;

                return;

              }


              const entry = {

                day: day,

                hour: hour,

                class: className,

                professorName:
                  profSigle,

                course: course,

                room: room

              };


              if (
                !schedules.professors[
                  profSigle
                ]
              ) {

                schedules.professors[
                  profSigle
                ] = [];

              }


              schedules.professors[
                profSigle
              ].push(
                entry
              );


              if (
                !schedules.classes[
                  className
                ]
              ) {

                schedules.classes[
                  className
                ] = [];

              }


              schedules.classes[
                className
              ].push(
                entry
              );


              if (
                !schedules.rooms[
                  room
                ]
              ) {

                schedules.rooms[
                  room
                ] = [];

              }


              schedules.rooms[
                room
              ].push(
                entry
              );


              profHoursCounter[
                profSigle
              ] =
                (
                  profHoursCounter[
                    profSigle
                  ] || 0
                ) + 1;


              importedLines++;

            }
          );


          if (
            importedLines === 0
          ) {

            throw new Error(
              'Aucune ligne valide trouvee dans le fichier.'
            );

          }


          await setDoc(

            doc(
              db,
              'app_data',
              'current_schedule'
            ),

            {

              schedules:
                convertSetsToArrays(
                  schedules
                ),

              professorHours:
                profHoursCounter,

              updatedAt:
                new Date().toISOString()

            }

          );


          let message =
            'Fichier importe avec succes ! ';


          message +=
            importedLines +
            ' lignes importees.';


          if (
            ignoredLines > 0
          ) {

            message +=
              ' ' +
              ignoredLines +
              ' lignes ignorees.';

          }


          alert(message);


        } catch (err) {

          console.error(err);

          setError(
            'Erreur lors de l import : ' +
            (
              err.message ||
              'format du fichier incorrect.'
            )
          );


        } finally {

          setImporting(false);

        }

      };


    reader.onerror =
      () => {

        setError(
          'Impossible de lire le fichier.'
        );

        setImporting(false);

      };


    reader.readAsText(
      file
    );

  };


/* =======================================================
   ENTITES COURANTES
======================================================= */

const currentEntities =
  Object.keys(
    allSchedules[
      activeTab
    ] || {}
  ).sort();


/* =======================================================
   SELECTION COURANTE
======================================================= */

const currentSelection =
  selectedForPrint[
    activeTab
  ] || [];


/* =======================================================
   AJOUT / RETRAIT D'UNE ENTITE
======================================================= */

const toggleSelection =
  (entity) => {

    if (
      activeTab !== 'professors' &&
      activeTab !== 'classes'
    ) {

      return;

    }


    setSelectedForPrint(
      (previous) => {

        const current =
          previous[
            activeTab
          ] || [];


        if (
          current.includes(
            entity
          )
        ) {

          return {

            ...previous,

            [activeTab]:
              current.filter(
                (item) =>
                  item !== entity
              )

          };

        }


        return {

          ...previous,

          [activeTab]:
            [
              ...current,
              entity
            ]

        };

      }
    );

  };


/* =======================================================
   TOUT SELECTIONNER
======================================================= */

const selectAll =
  () => {

    if (
      activeTab !== 'professors' &&
      activeTab !== 'classes'
    ) {

      return;

    }


    setSelectedForPrint(
      (previous) => ({

        ...previous,

        [activeTab]:
          currentEntities

      })
    );

  };


/* =======================================================
   TOUT DESELECTIONNER
======================================================= */

const clearSelection =
  () => {

    if (
      activeTab !== 'professors' &&
      activeTab !== 'classes'
    ) {

      return;

    }


    setSelectedForPrint(
      (previous) => ({

        ...previous,

        [activeTab]:
          []

      })
    );

  };


/* =======================================================
   IMPRESSION MULTIPLE
======================================================= */

const handleMultiPrint =
  () => {

    if (
      currentSelection.length === 0
    ) {

      alert(
        'Selectionnez au moins un element.'
      );

      return;

    }


    setShowMultiPrint(
      true
    );


    setTimeout(
      () => {

        window.print();

      },
      250
    );

  };


/* =======================================================
   FIN DE L'IMPRESSION
======================================================= */

useEffect(() => {

  const afterPrint =
    () => {

      setShowMultiPrint(
        false
      );

    };


  window.addEventListener(
    'afterprint',
    afterPrint
  );


  return () => {

    window.removeEventListener(
      'afterprint',
      afterPrint
    );

  };

}, []);


/* =======================================================
   CHARGEMENT
======================================================= */

if (
  loading
) {

  return (

    <div className="flex items-center justify-center h-screen">

      <p>
        Chargement des horaires...
      </p>

    </div>

  );

}


/* =======================================================
   INTERFACE PRINCIPALE
======================================================= */

return (

  <>

    <style>{`

      @media print {

        @page {
          size: A4 portrait;
          margin: 4mm;
        }

        body {
          background: white !important;
        }

        body * {
          visibility: hidden;
        }

        #multi-print-area,
        #multi-print-area * {
          visibility: visible;
        }

        #multi-print-area {
          display: block !important;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
        }

        .multi-print-title {
          font-size: 16pt;
          text-align: center;
          font-weight: bold;
          margin: 0 0 5mm 0;
        }

        .multi-print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.5pt;
        }

        .multi-print-table th,
        .multi-print-table td {
          border: 1px solid #777;
          padding: 1.5mm;
          vertical-align: top;
        }

        .multi-print-table th {
          background: #eeeeee !important;
          font-weight: bold;
          text-align: center;
        }

        .multi-time-column {
          width: 28mm;
        }

        .multi-slot {
          font-weight: normal;
          background: #f8f8f8 !important;
        }

        .multi-day-name {
          font-weight: bold;
          font-size: 8pt;
          margin-bottom: 1mm;
        }

        .multi-hour-name {
          font-size: 7pt;
        }

        .multi-entry {
          line-height: 1.15;
          margin-bottom: 0.5mm;
        }

        .multi-empty {
          color: #999;
        }

        .multi-first-row-of-day td {
          border-top-width: 2px;
        }
.multi-print-table tbody tr {
  height: 5.4mm !important;
  max-height: 5.4mm !important;
}

.multi-print-table tbody td {
  height: 5.4mm !important;
  max-height: 5.4mm !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.multi-course-cell {
  height: 5.4mm !important;
  max-height: 5.4mm !important;
  padding: 0 0.2mm !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  vertical-align: middle !important;
}

.multi-entry {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 5.2pt !important;
  line-height: 5mm !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: clip !important;
}

.multi-entry strong,
.multi-entry span {
  white-space: nowrap !important;
}
      }

    `}</style>


    {showMultiPrint && (

      <MultiPrintView

        scheduleType={
          activeTab
        }

        selectedEntities={
          currentSelection
        }

        allSchedules={
          allSchedules
        }

      />

    )}


    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">


      <header className="max-w-6xl mx-auto mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-4 sm:p-6 rounded-lg shadow-sm">


        <div className="w-full md:w-auto">

          <h1
            onDoubleClick={
              handleSecretClick
            }
            className="text-2xl sm:text-3xl font-bold text-gray-900 cursor-default select-none"
          >

            Horaires des Professeurs

          </h1>


          <p className="text-sm text-gray-500 mt-1">

            Application synchronisee

          </p>

        </div>


        {showLogin && (

          <div className="mt-4 md:mt-0 p-4 border border-blue-200 bg-blue-50 rounded-lg w-full max-w-sm">

            <div className="flex justify-between items-center mb-3">

              <h3 className="text-sm font-semibold text-blue-900">

                Administration

              </h3>


              <button
                onClick={() =>
                  setShowLogin(false)
                }
                className="text-gray-400 hover:text-gray-600 text-sm"
              >

                X

              </button>

            </div>


            <form
              onSubmit={
                handleAdminLogin
              }
              className="space-y-3"
            >

              <input
                type="email"
                value={adminEmail}
                onChange={(e) =>
                  setAdminEmail(
                    e.target.value
                  )
                }
                placeholder="Adresse e-mail"
                autoComplete="username"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />


              <input
                type="password"
                value={adminPassword}
                onChange={(e) =>
                  setAdminPassword(
                    e.target.value
                  )
                }
                placeholder="Mot de passe"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />


              {loginError && (

                <p className="text-red-600 text-xs">

                  {loginError}

                </p>

              )}


              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowLogin(false)
                  }
                  className="px-3 py-2 text-sm text-gray-600"
                >

                  Annuler

                </button>


                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                >

                  Se connecter

                </button>

              </div>

            </form>

          </div>

        )}


        {showAdminPanel &&
          adminUser && (

            <div className="mt-4 md:mt-0 p-4 border border-green-200 bg-green-50 rounded-lg w-full md:w-auto max-w-sm">

              <div className="flex justify-between items-center mb-2">

                <h3 className="text-sm font-semibold text-green-900">

                  Import du fichier .txt

                </h3>


                <button
                  onClick={
                    handleAdminLogout
                  }
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >

                  Deconnexion

                </button>

              </div>


              <p className="text-xs text-green-700 mb-3">

                Connecte :{' '}

                {adminUser.email}

              </p>


              <input
                type="file"
                accept=".txt"
                onChange={
                  handleFileUpload
                }
                disabled={
                  importing
                }
                className="block w-full text-xs cursor-pointer"
              />


              <p className="text-xs text-gray-600 mt-1 truncate">

                Fichier :{' '}

                {fileName}

              </p>


              {importing && (

                <p className="text-xs text-blue-600 mt-2">

                  Import en cours...

                </p>

              )}

            </div>

          )}

      </header>


      {error && (

        <div className="max-w-6xl mx-auto bg-red-100 text-red-700 px-4 py-3 rounded mb-4">

          {error}

        </div>

      )}


      <main className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-3 sm:p-6">


        <div className="flex border-b border-gray-200 mb-4">

          {[
            'professors',
            'classes',
            'rooms'
          ].map(
            (tab) => (

              <button
                key={tab}
                onClick={() =>
                  setActiveTab(
                    tab
                  )
                }
                className={
                  'py-2 px-3 sm:px-4 font-medium text-sm border-b-2 capitalize ' +
                  (
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500'
                  )
                }
              >

                {tab === 'professors'
                  ? 'Professeurs'
                  : tab === 'classes'
                  ? 'Classes'
                  : 'Locaux'}

              </button>

            )
          )}

        </div>


        {(activeTab === 'professors' ||
          activeTab === 'classes') && (

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5">


            <div className="flex flex-wrap gap-2">

              <button
                onClick={
                  selectAll
                }
                className="px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 rounded-lg"
              >

                Tout selectionner

              </button>


              <button
                onClick={
                  clearSelection
                }
                className="px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 rounded-lg"
              >

                Tout deselectionner

              </button>

            </div>


            <div className="flex items-center gap-3">

              <span className="text-sm text-gray-600">

                {currentSelection.length}
                {' '}
                selectionne
                {currentSelection.length > 1
                  ? 's'
                  : ''}

              </span>


              <button
                onClick={
                  handleMultiPrint
                }
                disabled={
                  currentSelection.length === 0
                }
                className={
                  'px-4 py-2 rounded-lg font-semibold text-sm ' +
                  (
                    currentSelection.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )
                }
              >

                Imprimer la selection

              </button>

            </div>

          </div>

        )}


        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">


          {currentEntities.map(
            (entity) => {


              const selectable =

                activeTab === 'professors' ||

                activeTab === 'classes';


              const checked =

                selectable &&

                currentSelection.includes(
                  entity
                );


              return (

                <div
                  key={entity}
                  className={
                    'relative border rounded-lg transition ' +
                    (
                      checked
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    )
                  }
                >


                  {selectable && (

                    <label className="absolute top-2 left-2 z-10 cursor-pointer">

                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        onChange={() =>
                          toggleSelection(
                            entity
                          )
                        }
                        className="w-4 h-4 cursor-pointer"
                      />

                    </label>

                  )}


                  <button
                    onClick={() => {

                      setSelectedEntity(
                        entity
                      );

                      setIsModalOpen(
                        true
                      );

                    }}
                    className={
                      'w-full p-3 text-center hover:bg-blue-50 active:bg-blue-100 rounded-lg font-medium text-gray-700 transition min-h-[58px] ' +
                      (
                        selectable
                          ? 'pt-8'
                          : ''
                      )
                    }
                  >


                    <span className="break-words">

                      {entity}

                    </span>


                    {activeTab ===
                      'professors' &&
                      professorHours[
                        entity
                      ] && (

                        <span className="block text-xs font-normal text-gray-400 mt-0.5">

                          {professorHours[
                            entity
                          ]}{' '}

                          h

                        </span>

                      )}


                  </button>


                </div>

              );

            }
          )}


        </div>


      </main>


      {isModalOpen &&
        selectedEntity && (

          <ScheduleModal

            entityName={
              selectedEntity
            }

            scheduleType={
              activeTab
            }

            scheduleData={
              allSchedules[
                activeTab
              ]?.[
                selectedEntity
              ] || []
            }

            onClose={() => {

              setIsModalOpen(
                false
              );

              setSelectedEntity(
                null
              );

            }}

          />

        )}


    </div>


  </>

);

}


export default App;  
