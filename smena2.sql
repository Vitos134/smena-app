--
-- PostgreSQL database dump
--

\restrict 96ujGjeez93gbC6iiiZk7nQpOh5KHtrpk1S8qdWsstfpverKCsbDht8uTilsDIL

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    app_id integer NOT NULL,
    child_id integer,
    shift_id integer,
    season character varying(50),
    accommodation_type character varying(100),
    shift_number integer,
    price integer,
    status_id integer DEFAULT 1,
    rejection_reason text,
    payment_amount integer,
    card_mask character varying(20),
    payment_date timestamp without time zone,
    friend_request character varying(255)
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: applications_app_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.applications_app_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.applications_app_id_seq OWNER TO postgres;

--
-- Name: applications_app_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.applications_app_id_seq OWNED BY public.applications.app_id;


--
-- Name: children; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.children (
    child_id integer NOT NULL,
    parent_id integer,
    fio character varying(255) NOT NULL,
    birth_date date NOT NULL,
    snils character varying(50),
    oms character varying(50),
    address text,
    additional_info text,
    is_blacklisted boolean DEFAULT false,
    blacklist_reason text
);


ALTER TABLE public.children OWNER TO postgres;

--
-- Name: children_child_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.children_child_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.children_child_id_seq OWNER TO postgres;

--
-- Name: children_child_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.children_child_id_seq OWNED BY public.children.child_id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    document_id integer NOT NULL,
    child_id integer,
    document_type character varying(100),
    file_path text NOT NULL
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_document_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_document_id_seq OWNER TO postgres;

--
-- Name: documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_document_id_seq OWNED BY public.documents.document_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_role_id_seq OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    shift_id integer NOT NULL,
    program_name character varying(255) NOT NULL,
    shift_code character varying(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    capacity integer DEFAULT 30
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shifts_shift_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_shift_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_shift_id_seq OWNER TO postgres;

--
-- Name: shifts_shift_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_shift_id_seq OWNED BY public.shifts.shift_id;


--
-- Name: statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statuses (
    status_id integer NOT NULL,
    status_name character varying(50) NOT NULL
);


ALTER TABLE public.statuses OWNER TO postgres;

--
-- Name: statuses_status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statuses_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statuses_status_id_seq OWNER TO postgres;

--
-- Name: statuses_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statuses_status_id_seq OWNED BY public.statuses.status_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id integer DEFAULT 1,
    fio character varying(255),
    phone character varying(50),
    address text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: applications app_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications ALTER COLUMN app_id SET DEFAULT nextval('public.applications_app_id_seq'::regclass);


--
-- Name: children child_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children ALTER COLUMN child_id SET DEFAULT nextval('public.children_child_id_seq'::regclass);


--
-- Name: documents document_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN document_id SET DEFAULT nextval('public.documents_document_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Name: shifts shift_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN shift_id SET DEFAULT nextval('public.shifts_shift_id_seq'::regclass);


--
-- Name: statuses status_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses ALTER COLUMN status_id SET DEFAULT nextval('public.statuses_status_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.applications (app_id, child_id, shift_id, season, accommodation_type, shift_number, price, status_id, rejection_reason, payment_amount, card_mask, payment_date, friend_request) FROM stdin;
2	6	2	Лето	Корпус стандарт	1	35000	2	\N	\N	\N	\N	\N
3	2	2	Лето	Глэмпинг	1	55000	4	\N	55000	**** **** **** 9872	2026-06-15 22:06:10.032753	\N
5	8	2	Осень	Корпус улучшенный	1	45000	2	\N	\N	\N	\N	\N
4	7	2	Лето	Корпус улучшенный	1	45000	2	\N	\N	\N	\N	\N
6	9	2	Осень	Корпус стандарт	1	35000	2	\N	\N	\N	\N	\N
7	10	3	Осень	Корпус стандарт	1	35000	3	Необходимо обновить документы	\N	\N	\N	Суханов Артём Романович
\.


--
-- Data for Name: children; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.children (child_id, parent_id, fio, birth_date, snils, oms, address, additional_info, is_blacklisted, blacklist_reason) FROM stdin;
2	3	Казаков Николай Иосифович	2004-06-21	92347197123	1234123084701243	Г. Волгоград, пр-кт. Университетский, д. 1	Аллергия на цитрусовые	f	\N
4	3	Суханов Артём Романович	2004-02-11	12342083740	1234213085719238	Г. Волгоград, пр-кт. Университетский, д. 1	Не любит рыбу	t	Причина не указана менеджером
6	5	Чушкин Никита Алексеевич	2004-06-08	23423423634	3456345633542354	Г. Фролово, ул. Пролетарская, д. 12, кв. 1	Не любит компот из сухофруктов	f	\N
8	7	Иванова Мария Ивановна	2015-08-20	11122233355	1111222233335555	г. Волгоград, ул. Ленина, д. 10, кв. 5		f	\N
7	7	Иванов Петр Иванович	2012-05-15	11122233344	1111222233334444	г. Волгоград, ул. Ленина, д. 10, кв. 5	Аллергия на цитрусовые	f	\N
9	8	Соколов Илья Евгеньевич	2010-09-30	44455566677	4444555566667777	г. Волжский, ул. Мира, д. 15, кв. 12	Спец. питание (состоит на учете у гастроэнтеролога)	f	\N
10	9	Соколов Илья Евгеньевич	2010-09-30	44455512313	4444555566667777	г. Волгоград, ул. Рабоче-Крестьянская, 30, кв. 7	Спец. питание (состоит на учете у гастроэнтеролога)	f	\N
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (document_id, child_id, document_type, file_path) FROM stdin;
2	2	Свидетельство о рождении	/uploads/1781496459208-Приложение 5.pdf
3	2	Полис ОМС	/uploads/1781496479961-Приложение 6.docx
4	2	Мед. справка 079/у	/uploads/1781496487153-Приложение 6.pdf
5	6	Свидетельство о рождении	/uploads/1781549897508-soglasie.pdf
8	6	Полис ОМС	/uploads/1781549955501-Cell Spool Winder - Assembly instructions.pdf
9	6	Мед. справка 079/у	/uploads/1781549968341-Заявка_СтС-610128.pdf
10	7	Свидетельство о рождении	/uploads/1781553594137-soglasie.pdf
11	7	Полис ОМС	/uploads/1781553620788-40638010.pdf
12	7	Мед. справка 079/у	/uploads/1781553638888-d06fc4bff20e9e43f274d86f126515c9.jpg
13	8	Свидетельство о рождении	/uploads/1781553741759-soglasie.pdf
14	8	Полис ОМС	/uploads/1781553748380-40638010.pdf
15	8	Мед. справка 079/у	/uploads/1781553771878-d06fc4bff20e9e43f274d86f126515c9.jpg
16	9	Свидетельство о рождении	/uploads/1781554756823-soglasie.pdf
18	9	Мед. справка 079/у	/uploads/1781554812108-Bones - Eyesclosed.flac
19	9	Полис ОМС	/uploads/1781554825687-BONES - FrenchTerryCloth.mp3
20	10	Свидетельство о рождении	/uploads/1781561461512-motivation_archimate.png
21	10	Полис ОМС	/uploads/1781561471167-export- (2).stl
22	10	Мед. справка 079/у	/uploads/1781561488559-ЛР2 Ржавский.docx
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (role_id, role_name) FROM stdin;
1	Родитель
2	Менеджер
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (shift_id, program_name, shift_code, start_date, end_date, capacity) FROM stdin;
1	IT-Смена	ЛЕТО-01	2026-06-17	2026-07-01	28
2	ВЗЛЁТ-26	ОСЕНЬ-02	2026-09-05	2026-09-12	5
3	Арт-Творчество	ЛЕТО-02	2026-06-25	2026-07-15	25
4	Спортивный Олимп	ЛЕТО-03	2026-07-20	2026-08-09	40
5	IT-Академия	ЛЕТО-04	2026-08-12	2026-08-31	15
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statuses (status_id, status_name) FROM stdin;
1	В работе
2	Одобрена
3	Отклонена
4	Оплачена
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, email, password_hash, role_id, fio, phone, address) FROM stdin;
3	arzhavskii@mail.ru	$2b$10$84xEpb2clO7y8gNPPTHGTOU22s/NTMM4OgIvHS/sxFbTIAKUfeoyG	1	Ржавский Андрей Сергеевич	+7 (904) 774-18-03	Г. Волгоград, пр-кт. Университетский, д. 1
4	admin@admin.com	$2b$10$FwtBDGKE/Q9Zp0SpG272ouVQ1.Y/C9mxzm/NroQyuEMB.pL/Sq/wG	2	\N	\N	\N
5	Smirnov.IV@gmail.com	$2b$10$IMfHgyySsjz.mHj8dV1baeJRiHK3kHM4Wt4JIZj6PEn5LOb70wSda	1	Смирнов Иван Васильевич	+7 (912) 312-12-41	Г. Фролово, ул. Пролетарская, д. 12, кв. 1
6	aslidu8aw@gmail.com	$2b$10$ZlGFqmp74WzuUyj4.fhqbOc8BPgw50wD12fOaWseXowfZWE3GPsBu	1	\N	\N	\N
7	ivanov@mail.ru	$2b$10$uLGhH8zcaUS0mkmSJg.gFeC7BmbjWjrd2lzmXf3DZO2DkamMucmbW	1	ivanov@mail.ru	+7 (902) 111-22-33	г. Волгоград, ул. Ленина, д. 10, кв. 5
8	smirnova@yandex.ru	$2b$10$Hax6TSuunlI8xVu1AMrdzOzXBMZkBITuXQixAZ/HYYSVExRhVDjiy	1	Смирнова Анна Сергеевна	+7 (903) 222-33-44	г. Волжский, ул. Мира, д. 15, кв. 12
9	sokolova@mail.ru	$2b$10$DIH/ITD6kqYJdeY9IZxCOOj2VSB/f2NLL9VjTRNOJpGFDPt8lcCFG	1	Соколова Елена Дмитриевна	+7 (905) 444-55-66	г. Волгоград, ул. Рабоче-Крестьянская, 30, кв. 7
\.


--
-- Name: applications_app_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.applications_app_id_seq', 7, true);


--
-- Name: children_child_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.children_child_id_seq', 10, true);


--
-- Name: documents_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_document_id_seq', 22, true);


--
-- Name: roles_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_role_id_seq', 1, false);


--
-- Name: shifts_shift_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_shift_id_seq', 5, true);


--
-- Name: statuses_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.statuses_status_id_seq', 1, false);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_user_id_seq', 9, true);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (app_id);


--
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (child_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (document_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (shift_id);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (status_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: applications applications_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(child_id) ON DELETE CASCADE;


--
-- Name: applications applications_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(shift_id) ON DELETE CASCADE;


--
-- Name: applications applications_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.statuses(status_id);


--
-- Name: children children_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: documents documents_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(child_id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- PostgreSQL database dump complete
--

\unrestrict 96ujGjeez93gbC6iiiZk7nQpOh5KHtrpk1S8qdWsstfpverKCsbDht8uTilsDIL

