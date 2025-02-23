const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      title: 'pages.home.title',
      anonymous: true,
    },
    children: [
      {
        path: '/login',
        name: 'login',
        meta: { title: 'pages.login.title' },
        component: () => import('@/views/Login.vue'),
      },
      {
        path: '/signin',
        name: 'signin',
        meta: {
          title: 'pages.login.title',
          anonymous: true,
        },
        component: () => import('@/views/SignIn.vue'),
      },
      {
        path: '/signInError',
        name: 'signInError',
        component: () => import('@/views/SignInError.vue'),
        meta: {
          title: ' ',
          anonymous: true,
        },
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        meta: {
          title: 'pages.dashboard.title',
          anonymous: true,
        },
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: '/add',
        name: 'songNew',
        meta: {
          title: 'pages.dashboard.title',
          anonymous: true,
        },
        component: () => import('@/views/SongNew.vue'),
      },
      {
        path: '/edit',
        name: 'songEdit',
        meta: {
          title: 'pages.dashboard.title',
          anonymous: true,
        },
        component: () => import('@/views/SongEdit.vue'),
      },
      {
        path: '/akordi/artists',
        name: 'akordiArtistList',
        meta: {
          title: 'pages.akordiArtistList.title',
          anonymous: true,
        },
        component: () => import('@/views/ArtistList.vue'),
      },
      {
        path: '/find/:letter',
        name: 'akordiArtistLetter',
        meta: {
          title: 'pages.akordiArtistLetter.title',
          anonymous: true,
        },
        component: () => import('@/views/ArtistList.vue'),
      },
      {
        path: '/band/:url',
        name: 'akordiArtistView',
        meta: {
          title: 'pages.akordiArtistLetter.title',
          anonymous: true,
          breadcrumbs: [
            { text: 'pages.akordiArtistLetter.title', to: { name: 'akordiArtistList' } },
          ],
        },
        component: () => import('@/views/ArtistView.vue'),
      },
      {
        path: '/search',
        name: 'songSearch',
        meta: {
          title: 'pages.songSearch.title',
          description: 'pages.songSearch.description',
          anonymous: true,
        },
        component: () => import('@/views/SongSearch.vue'),
      },
      {
        path: '/search/song/:url',
        name: 'songSearchSongView',
        meta: {
          anonymous: true,
          breadcrumbs: [
            {
              text: 'pages.songSearch.title',
              to: { name: 'songSearch' },
              retainQueryParams: true,
            },
          ],
        },
        component: () => import('@/views/SongView.vue'),
      },
      {
        path: '/new',
        name: 'songListNew',
        meta: {
          title: 'pages.songListNew.title',
          description: 'pages.songListNew.description',
          anonymous: true,
          breadcrumbs: [{ text: 'pages.songSearch.title', to: { name: 'songSearch' } }],
        },
        component: () => import('@/views/SongListNew.vue'),
      },
      {
        path: '/new/song/:url',
        name: 'songListNewSongView',
        meta: {
          anonymous: true,
          breadcrumbs: [
            {
              text: 'pages.songListNew.title',
              to: { name: 'songListNew' },
            },
          ],
        },
        component: () => import('@/views/SongView.vue'),
      },
      {
        path: '/top',
        name: 'songListTop',
        meta: {
          title: 'pages.songListTop.title',
          description: 'pages.songListTop.description',
          anonymous: true,
          breadcrumbs: [{ text: 'pages.songSearch.title', to: { name: 'songSearch' } }],
        },
        component: () => import('@/views/SongListTop.vue'),
      },
      {
        path: '/top/song/:url',
        name: 'songListTopSongView',
        meta: {
          anonymous: true,
          breadcrumbs: [
            {
              text: 'pages.songListTop.title',
              to: { name: 'songListTop' },
            },
          ],
        },
        component: () => import('@/views/SongView.vue'),
      },
      {
        path: '/song/:url',
        name: 'akordiSongView',
        meta: {
          anonymous: true,
        },
        component: () => import('@/views/SongView.vue'),
      },
      {
        path: '/tags',
        name: 'tagList',
        meta: {
          title: 'pages.tagList.title',
          description: 'pages.tagList.description',
          anonymous: true,
        },
        component: () => import('@/views/TagList.vue'),
      },
      {
        path: '/tag/:url',
        name: 'tagView',
        meta: {
          title: 'pages.tagView.title',
          anonymous: true,
          breadcrumbs: [{ text: 'pages.tagList.title', to: { name: 'tagList' } }],
        },
        component: () => import('@/views/TagView.vue'),
      },
      {
        path: '/user/profile',
        name: 'userProfile',
        meta: {
          title: 'pages.userProfile.title',
          anonymous: false,
        },
        component: () => import('@/views/UserProfile.vue'),
      },
      {
        path: '/error',
        name: 'error',
        component: () => import('@/views/Error404.vue'),
        meta: { title: ' ', anonymous: true },
      },
      {
        path: '/forbidden',
        name: 'forbidden',
        component: () => import('@/views/Error403.vue'),
        meta: { title: ' ', anonymous: true },
      },
      {
        path: '/not-authorized',
        name: 'notAuthorized',
        component: () => import('@/views/Error401.vue'),
        meta: { title: ' ', anonymous: true },
      },
      {
        path: '/sessionEnded',
        name: 'sessionEnded',
        component: () => import('@/views/SessionEnded.vue'),
        meta: { title: 'pages.sessionEnded.title', anonymous: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'notFound',
        alias: '/notFound',
        meta: { title: 'pages.users.title', anonymous: true },
        component: () => import('@/views/NotFound.vue'),
      },

      {
        path: '/auth-done',
        name: 'authDone',
        component: () => import('@/views/AuthDone.vue'),
        meta: { title: 'pages.auth.title', anonymous: true },
      },
    ],
  },
];

export default routes;
