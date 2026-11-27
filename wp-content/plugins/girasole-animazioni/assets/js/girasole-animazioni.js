/*!
 * Girasole – Animazioni: nucleo comune.
 * - trova da solo i widget Elementor del contenuto (niente header/footer, niente ".no-anim");
 * - fasce "a finestra": foto ferma, la fascia scorre sopra (strato position:fixed ritagliato da clip-path);
 * - parallasse leggero (per la hero e come ripiego sui telefoni);
 * - il "regista": gli elementi che entrano insieme partono in fila, al massimo 5 in sequenza.
 * Gli stili (stile-*.js) si registrano in GirasoleAnim.stili e usano questi strumenti.
 */
(function () {
	'use strict';

	var html = document.documentElement;
	var C = window.GirasoleAnimConfig || {};
	var A = (window.GirasoleAnim = { stili: {}, config: C });

	function sblocca() {
		html.classList.remove('gs-attesa');
		A.pronto = true;
	}

	var ridotto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (ridotto || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
		sblocca();
		return;
	}
	gsap.registerPlugin(ScrollTrigger);

	/* ---------- strumenti ---------- */

	var TEL = '(max-width: 767px)';
	A.telefono = function () { return matchMedia(TEL).matches; };

	// Contenuto della pagina: solo il documento Elementor della pagina, mai header (#masthead) e footer (#colophon).
	A.radice = function () {
		return document.querySelector('#content [data-elementor-type="wp-page"]') ||
			document.querySelector('[data-elementor-type="wp-page"]');
	};

	A.escluso = function (el) {
		return !!el.closest('.no-anim, #masthead, #colophon, [data-elementor-type="header"], [data-elementor-type="footer"]');
	};

	A.urlSfondo = function (el) {
		var m = (getComputedStyle(el).backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/);
		return m ? m[1] : null;
	};

	// Foto vera (non i disegni decorativi, che sono PNG/SVG/GIF).
	A.eFoto = function (url) {
		return !!url && !/\.(png|svg|gif)(\?|#|$)/i.test(url);
	};

	// Contenitore con foto di sfondo a riempimento ("cover"), es. le colonne foto o le fasce.
	A.contenitoreFoto = function (el) {
		return A.eFoto(A.urlSfondo(el)) && /cover/.test(getComputedStyle(el).backgroundSize);
	};

	A.sezioni = function (radice) {
		return Array.prototype.filter.call(radice.querySelectorAll('.e-con.e-parent'), function (s) {
			return s.parentElement && s.parentElement.closest('.e-con') === null;
		});
	};

	/* ---------- strato foto (finestra / parallasse) ---------- */

	// Crea dentro "el" uno strato con la foto. modo "fisso" = foto ferma rispetto allo schermo,
	// ritagliata dalla fascia (clip-path); modo "parallasse" = foto un po' più alta che scorre piano.
	function strato(el, foto) {
		var s = document.createElement('div');
		s.className = 'gs-strato';
		s.setAttribute('aria-hidden', 'true');
		var f = document.createElement('div');
		f.className = 'gs-strato__foto';
		f.style.backgroundImage = 'url("' + foto.url + '")';
		f.style.backgroundPosition = foto.pos || '50% 50%';
		s.appendChild(f);
		el.insertBefore(s, el.firstChild);
		if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
		el.classList.add('gs-con-strato', 'gs-con-strato--' + foto.tipo);
		if (foto.img) foto.img.classList.add('gs-nascosta');
		return f;
	}

	// La versione più grande dell'immagine (il browser sceglie dal srcset quella adatta al widget,
	// ma nella finestra la foto copre tutto lo schermo e quella piccola verrebbe sfocata).
	function urlGrande(img) {
		var meglio = img.currentSrc || img.src, max = 0;
		(img.getAttribute('srcset') || '').split(',').forEach(function (c) {
			var p = c.trim().split(/\s+/), w = parseInt(p[1], 10);
			if (p[0] && /w$/.test(p[1] || '') && w > max) { max = w; meglio = p[0]; }
		});
		return meglio;
	}

	function datiFoto(el, img) {
		if (img) {
			return { tipo: 'immagine', img: img, url: urlGrande(img), pos: getComputedStyle(img).objectPosition };
		}
		return { tipo: 'sfondo', url: A.urlSfondo(el), pos: getComputedStyle(el).backgroundPosition };
	}

	// Parallasse: la foto è più alta della fascia del 2k e scende da -k a +k mentre la fascia attraversa lo schermo.
	A.parallasse = function (el, img, k, inizio) {
		var f = strato(el, datiFoto(el, img));
		el.classList.add('gs-modo-parallasse');
		f.style.top = (-k * 100) + '%';
		f.style.height = (100 + 2 * k * 100) + '%';
		gsap.fromTo(f, { y: function () { return -k * el.offsetHeight; } }, {
			y: function () { return k * el.offsetHeight; },
			ease: 'none',
			scrollTrigger: { trigger: el, start: inizio || 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
		});
		return f;
	};

	// Finestra: foto position:fixed alta quanto lo schermo, larga e allineata come la fascia.
	// Funziona anche su iPhone (al contrario di background-attachment: fixed) e lo scorrimento
	// lo fa il browser, non il JavaScript: niente scatti. Il JS misura solo larghezza e posizione orizzontale.
	function finestraFissa(el, img) {
		var f = strato(el, datiFoto(el, img));
		el.classList.add('gs-modo-fisso');
		function misura() {
			var r = el.getBoundingClientRect();
			f.style.left = r.left + 'px';
			f.style.width = r.width + 'px';
		}
		misura();
		if (window.ResizeObserver) new ResizeObserver(misura).observe(el);
		ScrollTrigger.addEventListener('refresh', misura);
		// fuori dallo schermo la foto non si disegna
		var st = ScrollTrigger.create({
			trigger: el, start: 'top bottom', end: 'bottom top',
			onToggle: function (self) { f.style.visibility = self.isActive ? '' : 'hidden'; },
			onRefresh: function (self) { f.style.visibility = self.isActive ? '' : 'hidden'; }
		});
		f.style.visibility = st.isActive ? '' : 'hidden';
	}

	// Fasce candidate: contenitori a tutta larghezza con foto di sfondo (non video), le colonne foto
	// dentro una fascia a tutta larghezza, le fasce fatte da un solo widget Immagine; oppure classe "finestra".
	A.trovaFinestre = function (radice) {
		var out = [], visti = [];
		function aggiungi(el, img) {
			if (visti.indexOf(el) < 0 && !A.escluso(el)) { visti.push(el); out.push({ el: el, img: img || null }); }
		}
		Array.prototype.forEach.call(radice.querySelectorAll('.finestra'), function (el) {
			if (A.escluso(el)) return;
			if (A.eFoto(A.urlSfondo(el))) aggiungi(el);
			else { var img = el.querySelector('img'); if (img) aggiungi(el, img); }
		});
		A.sezioni(radice).forEach(function (s, i) {
			if (i === 0 && C.home) return; // la hero della Home ha il parallasse dello stile, non la finestra
			if (A.contenitoreFoto(s)) { aggiungi(s); return; }
			if (!s.classList.contains('e-con-full')) return;
			var widget = s.querySelectorAll('.elementor-widget');
			if (widget.length === 1 && widget[0].classList.contains('elementor-widget-image')) {
				var img = widget[0].querySelector('img');
				if (img && A.eFoto(img.currentSrc || img.src)) aggiungi(s, img);
				return;
			}
			Array.prototype.forEach.call(s.querySelectorAll(':scope > .e-con, :scope > .e-con-inner > .e-con'), function (c) {
				if (!c.querySelector('.elementor-widget') && A.contenitoreFoto(c)) aggiungi(c);
			});
		});
		return out;
	};

	function avviaFinestre(radice) {
		var finestre = A.trovaFinestre(radice);
		var modoTel = C.finestreTelefono === 'parallasse' ? 'parallasse' : 'fisso';
		finestre.forEach(function (fin) {
			fin.el.classList.add('gs-finestra');
			if (modoTel === 'parallasse' && A.telefono()) A.parallasse(fin.el, fin.img, 0.12);
			else finestraFissa(fin.el, fin.img);
		});
		return finestre;
	}

	/* ---------- raccolta degli elementi da animare ---------- */

	var NON_ANIMARE = /elementor-widget-(video|google_maps|html|shortcode|spacer|wp-widget|menu-anchor|form|wpforms|contact-form-7|navigation-menu|hfe-)/;
	var FOTO_WIDGET = /elementor-widget-(image|image-carousel|image-gallery|image-box)\b/;

	// Restituisce [{el, tipo}] in ordine di pagina. Tipi: titolo, foto, testo, pulsante.
	A.raccogli = function (radice) {
		var out = [];
		Array.prototype.forEach.call(radice.querySelectorAll('.elementor-widget, .e-con.e-child'), function (el) {
			if (A.escluso(el) || el.closest('.gs-finestra') && el.closest('.gs-con-strato--immagine')) return;
			if (el.parentElement.closest('.elementor-widget')) return; // widget dentro widget
			var c = el.className, tipo = null;
			if (el.classList.contains('e-con')) {
				if (!el.classList.contains('gs-finestra') && !el.querySelector('.elementor-widget') && A.contenitoreFoto(el)) tipo = 'foto';
			} else if (NON_ANIMARE.test(c)) {
				tipo = null;
			} else if (c.indexOf('elementor-widget-heading') > -1) {
				var t = el.querySelector('.elementor-heading-title');
				tipo = t && /^H[1-6]$/.test(t.tagName) ? 'titolo' : 'testo';
			} else if (FOTO_WIDGET.test(c)) {
				tipo = 'foto';
			} else if (c.indexOf('elementor-widget-button') > -1) {
				tipo = 'pulsante';
			} else {
				tipo = 'testo';
			}
			if (tipo) out.push({ el: el, tipo: tipo });
		});
		return out;
	};

	// Ordina gli elementi come compaiono nella pagina.
	A.ordina = function (items) {
		return items.sort(function (a, b) {
			return a.el === b.el ? 0 : (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1);
		});
	};

	// I "blocchi" di un widget di testo (paragrafi, elenchi, voci): servono per farli salire uno dopo l'altro.
	A.blocchi = function (el) {
		var box = el.querySelector(':scope > .elementor-widget-container') || el;
		var figli = Array.prototype.filter.call(box.children, function (c) {
			return c.offsetHeight > 0 && !/^(STYLE|SCRIPT|BR)$/.test(c.tagName);
		});
		return figli.length > 1 ? figli : [el];
	};

	// Raggio degli angoli di un elemento (o della prima immagine dentro), in px.
	A.raggio = function (el) {
		var r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
		if (!r) {
			var img = el.querySelector('img');
			if (img) r = parseFloat(getComputedStyle(img).borderTopLeftRadius) || 0;
		}
		return r;
	};

	/* ---------- regista ---------- */

	// opzioni: { prepara(item), forte(item), leggero(item), inizio, passo }. Un item è "forte" se è titolo, foto o ha forte:true.
	// Gli elementi che entrano insieme partono in fila: i "forti" (titoli, foto) a "passo" secondi l'uno
	// dall'altro, al massimo 5 in sequenza (gli altri insieme al quinto); i "leggeri" tutti insieme.
	A.regista = function (items, op) {
		var mappa = new Map();
		items.forEach(function (it) { mappa.set(it.el, it); op.prepara(it); });
		var passo = op.passo || 0.18;
		ScrollTrigger.batch(items.map(function (it) { return it.el; }), {
			start: op.inizio || (A.telefono() ? 'top 94%' : 'top 88%'),
			once: true,
			onEnter: function (els) {
				var forti = 0, leggeri = 0, primoForte = null;
				els.forEach(function (el) {
					var it = mappa.get(el);
					if (it.forte || it.tipo === 'titolo' || it.tipo === 'foto') {
						var t = Math.min(forti, 4) * passo;
						if (primoForte === null) primoForte = t;
						forti++;
						gsap.delayedCall(t, function () { op.forte(it); });
					} else {
						var d = (primoForte === null ? 0 : 0.15) + Math.min(leggeri, 4) * 0.05;
						leggeri++;
						gsap.delayedCall(d, function () { op.leggero(it); });
					}
				});
			}
		});
	};

	/* ---------- avvio ---------- */

	function avvia() {
		var radice = A.radice();
		if (!radice || document.body.classList.contains('elementor-editor-active')) { sblocca(); return; }
		radice.classList.add('gs-radice');
		try {
			if (C.finestre) avviaFinestre(radice);
			var stile = A.stili[C.stile];
			if (stile) stile(A, radice);
		} catch (e) {
			if (window.console) console.error('Girasole animazioni:', e);
			gsap.set(radice.querySelectorAll('.elementor-widget, .e-con'), { clearProps: 'opacity,transform,clipPath,visibility' });
		}
		sblocca();
		// l'header mobile (fisarmonica), "Tutte le info" e le immagini cambiano l'altezza: ricalcola
		if (window.ResizeObserver) {
			var h = 0, timer;
			new ResizeObserver(function () {
				if (document.body.offsetHeight === h) return;
				h = document.body.offsetHeight;
				clearTimeout(timer);
				timer = setTimeout(function () { ScrollTrigger.refresh(); }, 200);
			}).observe(document.body);
		}
	}

	function quandoPronto() {
		// i titoli vanno spezzati in righe con i font già caricati (al massimo 800 ms di attesa)
		var font = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
		Promise.race([font, new Promise(function (r) { setTimeout(r, 800); })]).then(avvia, avvia);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', quandoPronto);
	else quandoPronto();
})();
